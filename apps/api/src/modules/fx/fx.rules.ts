import { FX_API } from './fx.constants';

/** A stored rate is stale once it is older than the configured window (D9 "dynamic" rates). */
export function isStale(asOf: Date, now: Date, staleAfterMinutes: number): boolean {
  return now.getTime() - asOf.getTime() > staleAfterMinutes * FX_API.MS_PER_MINUTE;
}
