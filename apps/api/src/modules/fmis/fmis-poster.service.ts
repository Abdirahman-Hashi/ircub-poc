import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { AlertSeverity, AlertType, JournalBatchStatus } from '@ircub/shared';

import { JOB } from '../../common/jobs/job-names';
import { JobsService } from '../../common/jobs/jobs.service';
import { EventBus } from '../../common/sse/event-bus';
import { SSE_EVENT } from '../../common/sse/event-names';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../dashboard/alerts.service';
import { ALERT_TEXT } from '../dashboard/dashboard.constants';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { FMIS_CLIENT } from './fmis.constants';
import { FMIS_MESSAGES } from './fmis.messages';
import { nextPostingAttempt, toDateKey, toFmisPayload } from './fmis.rules';

import type { FmisClient } from './fmis.types';

/**
 * `fmis.post-batch` job (D17). Idempotent: a POSTED batch is a no-op and the FMIS answers a
 * repeated batch id with the same reference. A failure counts an attempt and throws so pg-boss
 * retries with backoff; at the configured limit the batch is FAILED with the last error and a
 * supervisor can retry it from the UI.
 */
@Injectable()
export class FmisPosterService implements OnModuleInit {
  private readonly logger = new Logger(FmisPosterService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FMIS_CLIENT) private readonly fmis: FmisClient,
    private readonly systemConfig: SystemConfigService,
    private readonly jobs: JobsService,
    private readonly events: EventBus,
    private readonly alerts: AlertsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.jobs.register(JOB.FMIS_POST_BATCH, ({ batchId, forceFailure }) =>
      this.post(batchId, forceFailure ?? false),
    );
    await this.recoverPending();
  }

  /**
   * Batches left PENDING (seeded while the FMIS was down, or a crash between build and
   * enqueue) are re-enqueued on boot. Posting is idempotent, so a duplicate job is harmless.
   */
  private async recoverPending(): Promise<void> {
    const pending = await this.prisma.journalBatch.findMany({
      where: { status: JournalBatchStatus.PENDING },
      select: { id: true },
    });
    for (const batch of pending) {
      await this.jobs.enqueue(
        JOB.FMIS_POST_BATCH,
        { batchId: batch.id },
        { singletonKey: batch.id },
      );
    }
    if (pending.length > 0) {
      this.logger.log({ msg: 'pending journal batches re-enqueued', count: pending.length });
    }
  }

  async post(batchId: string, forceFailure = false): Promise<void> {
    const batch = await this.prisma.journalBatch.findUnique({
      where: { id: batchId },
      include: { lines: true },
    });
    if (
      batch === null ||
      batch.status === JournalBatchStatus.POSTED ||
      batch.status === JournalBatchStatus.REVERSED
    ) {
      return; // Already posted (or never existed): nothing to do.
    }
    const date = toDateKey(batch.batchDate);
    try {
      const response = await this.fmis.postJournal(
        { batchId, date, lines: toFmisPayload(batch.lines) },
        forceFailure,
      );
      const posted = await this.prisma.journalBatch.update({
        where: { id: batchId },
        data: {
          status: JournalBatchStatus.POSTED,
          fmisReference: response.fmisReference,
          postedAt: new Date(),
          attempts: batch.attempts + 1,
          lastError: null,
        },
      });
      this.events.emit(SSE_EVENT.FMIS_BATCH_UPDATED, { batchId, status: posted.status });
      this.logger.log({
        msg: 'journal batch posted',
        batchId,
        fmisReference: response.fmisReference,
        lines: batch.lines.length,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const limit = await this.systemConfig.get(SystemConfigKey.FMIS_POST_RETRY_LIMIT);
      const progress = nextPostingAttempt(batch.attempts, limit);
      const failed = await this.prisma.journalBatch.update({
        where: { id: batchId },
        data: {
          attempts: progress.attempts,
          lastError: message,
          ...(progress.exhausted ? { status: JournalBatchStatus.FAILED } : {}),
        },
      });
      this.logger.warn({
        msg: 'journal batch posting failed',
        batchId,
        attempts: progress.attempts,
        exhausted: progress.exhausted,
        error: message,
      });
      if (progress.exhausted) {
        this.events.emit(SSE_EVENT.FMIS_BATCH_UPDATED, { batchId, status: failed.status });
        this.logger.error({
          msg: FMIS_MESSAGES.POST_EXHAUSTED,
          batchId,
          attempts: progress.attempts,
        });
        await this.alerts.raise({
          type: AlertType.FMIS_BATCH_FAILED,
          severity: AlertSeverity.CRITICAL,
          title: ALERT_TEXT.FMIS_BATCH_FAILED.title,
          message: ALERT_TEXT.FMIS_BATCH_FAILED.message(date, progress.attempts, message),
          data: { batchId, date, attempts: progress.attempts, error: message },
          dedupeKey: batchId,
        });
        return;
      }
      throw error;
    }
  }
}
