import { Decimal } from 'decimal.js';

import { MONEY } from '@ircub/shared';

/** D9: amounts rounded HALF_EVEN to 2 dp at the end of a computation, rates to 6 dp. */
export const MONEY_ROUNDING = Decimal.ROUND_HALF_EVEN;
export const AMOUNT_SCALE = MONEY.AMOUNT_SCALE;
export const RATE_SCALE = MONEY.FX_RATE_SCALE;
export const PERCENT_DIVISOR = 100;
export const UNIT_RATE = new Decimal(1);
