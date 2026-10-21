import type { BillStatus } from '@ircub/shared';

import type { Decimal } from 'decimal.js';

export interface BillComputation {
  readonly accountId: string;
  readonly payerId: string;
  readonly previousReading: number;
  readonly currentReading: number;
  readonly consumption: number;
  readonly tierBreakdown: readonly {
    from: number;
    to: number | null;
    units: number;
    rate: string;
    amount: string;
  }[];
  readonly consumptionCharge: Decimal;
  readonly fixedCharge: Decimal;
  readonly arrears: Decimal;
  readonly totalDue: Decimal;
  readonly flagged: boolean;
  readonly flagReason: string | null;
  readonly status: BillStatus;
}

export interface RunOutcome {
  readonly billed: BillComputation[];
  readonly skipped: { accountNumber: string; reason: string }[];
}
