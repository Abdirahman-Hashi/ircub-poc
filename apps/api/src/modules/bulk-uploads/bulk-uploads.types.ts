import type { Currency, PaymentChannel } from '@ircub/shared';

import type { Prisma } from '@prisma/client';
import type { Decimal } from 'decimal.js';

/** Assessment facts the validator needs, keyed by control number. */
export interface AssessmentLookupEntry {
  readonly id: string;
  readonly payerId: string;
  readonly controlNumber: string;
  readonly status: string;
  /** Mutable running balance: earlier accepted rows in the file reduce it. */
  outstanding: Decimal;
}

/** Shared across rows of one file (D12 pipeline context). */
export interface RevenueImportContext {
  readonly assessments: Map<string, AssessmentLookupEntry>;
  readonly existingTxnRefs: Set<string>;
  readonly seenTxnRefs: Set<string>;
  readonly usersByEmail: Map<string, string>;
  readonly rates: Map<Currency, Decimal>;
  readonly localCurrency: Currency;
  readonly uploaderId: string;
  readonly fileName: string;
  readonly storedPath: string;
}

export type BulkUploadRow = Prisma.BulkUploadGetPayload<Record<string, never>>;

export interface TxnRefKey {
  readonly channel: PaymentChannel;
  readonly ref: string;
}
