import { Injectable, Logger } from '@nestjs/common';

import { FMIS } from '@ircub/shared';
import type { FmisJournalRequest, FmisLedgerEntry } from '@ircub/shared';

import { StoreService } from '../store/store.service';

import { isBalanced, ledgerFor, referenceFor } from './fmis.rules';

import type { JournalPostResult } from './fmis.types';

@Injectable()
export class FmisService {
  private readonly logger = new Logger(FmisService.name);

  constructor(private readonly store: StoreService) {}

  /** Idempotent on batchId: a repeat returns the stored journal unchanged. */
  post(request: FmisJournalRequest): JournalPostResult | null {
    const existing = this.store.journals.get(request.batchId);
    if (existing !== undefined) {
      this.logger.log({
        msg: 'journal repeated',
        batchId: request.batchId,
        fmisReference: existing.fmisReference,
      });
      return { journal: existing, created: false };
    }
    if (!isBalanced(request.lines)) {
      return null;
    }
    const journal = {
      batchId: request.batchId,
      fmisReference: referenceFor(request.batchId),
      date: request.date,
      postedAt: new Date().toISOString(),
      lines: request.lines.map((line) => ({ ...line })),
    };
    this.store.journals.set(request.batchId, journal);
    this.logger.log({
      msg: 'journal posted',
      batchId: request.batchId,
      fmisReference: journal.fmisReference,
      lines: journal.lines.length,
      status: FMIS.STATUS_POSTED,
    });
    return { journal, created: true };
  }

  ledger(date: string): FmisLedgerEntry[] {
    return ledgerFor(this.store.journals.values(), date);
  }
}
