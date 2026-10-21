import type { Currency } from '@ircub/shared';

export type RateTable = Record<Currency, number>;

/** Source of randomness for the drift; injected so tests are deterministic. */
export type RandomSource = () => number;
