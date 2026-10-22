import { Injectable, Logger } from '@nestjs/common';

import type {
  ForcedScenario,
  StoredJournal,
  StoredMessage,
  StoredPayment,
  StoreSnapshot,
} from './store.types';

/**
 * The only state in the mocks app. In-memory on purpose: restart or POST /__reset gives a
 * clean slate, which is what demos and e2e tests need. Phase 4/5 add the typed accessors
 * each mock system needs; phase 0 only provides reset and a snapshot.
 */
@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  readonly channelPayments = new Map<string, StoredPayment>();
  readonly journals = new Map<string, StoredJournal>();
  readonly outbox: StoredMessage[] = [];
  readonly scenarios = new Map<string, ForcedScenario>();

  reset(): StoreSnapshot {
    const before = this.snapshot();
    this.channelPayments.clear();
    this.journals.clear();
    this.outbox.length = 0;
    this.scenarios.clear();
    this.logger.log({ msg: 'store reset', cleared: before });
    return before;
  }

  snapshot(): StoreSnapshot {
    return {
      payments: this.channelPayments.size,
      journals: this.journals.size,
      outbox: this.outbox.length,
      scenarios: this.scenarios.size,
    };
  }
}
