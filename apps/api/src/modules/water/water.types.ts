import type { ReadingType } from '@ircub/shared';

import type { SKIP_REASON, TIER_VALIDATION } from './water.constants';
import type { DecimalLike } from '../../common/money/money.types';
import type { Decimal } from 'decimal.js';

export interface TierInput {
  readonly fromUnit: number;
  readonly toUnit: number | null;
  readonly ratePerUnit: DecimalLike;
}

export type TierValidationCode = (typeof TIER_VALIDATION)[keyof typeof TIER_VALIDATION];

export interface TierValidationError {
  readonly code: TierValidationCode;
  readonly index: number;
}

export interface TierChargeLine {
  readonly from: number;
  readonly to: number | null;
  readonly units: number;
  readonly rate: Decimal;
  readonly amount: Decimal;
}

export interface TieredCharge {
  readonly lines: readonly TierChargeLine[];
  readonly consumptionCharge: Decimal;
}

export interface MeterDial {
  readonly maxDigits: number;
  readonly initialReading: number;
}

export type ConsumptionResult =
  | { readonly ok: true; readonly consumption: number }
  | { readonly ok: false; readonly reason: 'READING_BELOW_PREVIOUS' };

export interface ReadingContext {
  readonly previousReading: number;
  readonly currentReading: number;
  readonly type: ReadingType;
  readonly meter: MeterDial;
}

export interface AbnormalResult {
  readonly abnormal: boolean;
  readonly reason: string | null;
  readonly mean: number | null;
}

export interface PreviousBillLedger {
  readonly totalDue: DecimalLike;
  readonly paidAmount: DecimalLike;
}

export interface PeriodBounds {
  readonly period: string;
  readonly start: Date;
  /** Last day of the month (inclusive). */
  readonly end: Date;
}

export type SkipReason = (typeof SKIP_REASON)[keyof typeof SKIP_REASON];

export interface StatementBillInput {
  readonly billNumber: string;
  readonly period: string;
  readonly releasedAt: Date;
  readonly totalDue: DecimalLike;
}

export interface StatementPaymentInput {
  readonly id: string;
  readonly reference: string;
  readonly paidAt: Date;
  readonly localAmount: DecimalLike;
}

export interface StatementComputation {
  readonly openingBalance: Decimal;
  readonly closingBalance: Decimal;
  readonly lines: readonly StatementComputedLine[];
}

export interface StatementComputedLine {
  readonly date: Date;
  readonly kind: 'OPENING' | 'BILL' | 'PAYMENT';
  readonly reference: string;
  readonly description: string;
  readonly debit: Decimal;
  readonly credit: Decimal;
  readonly balance: Decimal;
}
