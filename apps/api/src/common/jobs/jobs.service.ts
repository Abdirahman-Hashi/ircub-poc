import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import PgBoss from 'pg-boss';

import { AppConfigService } from '../../config/app-config.service';

import { JOB_NAMES } from './job-names';
import { JOBS } from './jobs.constants';

import type { EnqueueOptions, JobHandler, JobName, JobPayload } from './jobs.types';

/**
 * Thin, typed wrapper over pg-boss (D3). Business modules call `enqueue(JOB.X, payload)`
 * and `register(JOB.X, handler)`; the job name selects the payload type at compile time.
 * Queues are created on boot so a typo in a name fails fast instead of silently queueing.
 */
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private readonly boss: PgBoss;
  private started = false;

  constructor(config: AppConfigService) {
    this.boss = new PgBoss({
      connectionString: config.databaseUrl,
      schema: JOBS.SCHEMA,
      pollingIntervalSeconds: JOBS.POLLING_INTERVAL_SECONDS,
    });
  }

  async onModuleInit(): Promise<void> {
    this.boss.on('error', (error: Error) => {
      this.logger.error({ msg: 'pg-boss error', error: error.message }, error.stack);
    });
    await this.boss.start();
    for (const name of JOB_NAMES) {
      await this.ensureQueue(name);
    }
    this.started = true;
    this.logger.log({ msg: 'job queue started', queues: JOB_NAMES.length });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.started) {
      return;
    }
    await this.boss.stop({ graceful: true, timeout: JOBS.STOP_TIMEOUT_MS });
    this.started = false;
    this.logger.log('job queue stopped');
  }

  /** Readiness signal for `GET /ready`. */
  isReady(): boolean {
    return this.started;
  }

  async enqueue<J extends JobName>(
    name: J,
    payload: JobPayload<J>,
    options: EnqueueOptions = {},
  ): Promise<string | null> {
    const jobId = await this.boss.send(name, payload, options);
    this.logger.debug({ msg: 'job enqueued', job: name, jobId, payload });
    return jobId;
  }

  async register<J extends JobName>(name: J, handler: JobHandler<J>): Promise<void> {
    await this.boss.work<JobPayload<J>>(name, { batchSize: JOBS.BATCH_SIZE }, async (jobs) => {
      for (const job of jobs) {
        this.logger.log({ msg: 'job start', job: name, jobId: job.id, payload: job.data });
        try {
          await handler(job.data, job);
          this.logger.log({ msg: 'job done', job: name, jobId: job.id });
        } catch (error: unknown) {
          this.logger.error(
            { msg: 'job failed', job: name, jobId: job.id, payload: job.data },
            error instanceof Error ? error.stack : String(error),
          );
          throw error;
        }
      }
    });
  }

  private async ensureQueue(name: JobName): Promise<void> {
    const existing = await this.boss.getQueue(name);
    if (existing === null) {
      await this.boss.createQueue(name);
    }
  }
}
