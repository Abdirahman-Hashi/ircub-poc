import { Currency } from '@ircub/shared';

/**
 * Currency assessments, bills and journal lines are denominated in (SystemConfig
 * LOCAL_CURRENCY on the API). The web shows it as a label; amounts always arrive converted.
 */
export const LOCAL_CURRENCY: Currency = Currency.SOS;
