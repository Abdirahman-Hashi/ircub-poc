import { RANGE_PRESETS } from './dashboard.constants';

import type { DateRange, ForecastChartRow, RangePreset } from './dashboard.types';
import type { ForecastPoint } from '../../api/types';

const DATE_LENGTH = 'YYYY-MM-DD'.length;
const MONTH_LENGTH = 'YYYY-MM'.length;

function dateKey(date: Date): string {
  return date.toISOString().slice(0, DATE_LENGTH);
}

/** From/to for a preset, ending today (UTC). */
export function presetRange(preset: RangePreset, now: Date): DateRange {
  const to = dateKey(now);
  const definition = RANGE_PRESETS.find((p) => p.value === preset);
  if (definition === undefined || definition.days === null) {
    return { from: `${now.getUTCFullYear()}-01-01`, to };
  }
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - (definition.days - 1));
  return { from: dateKey(from), to };
}

/** `YYYY-MM` keys covered by a date range (inclusive). */
export function monthsOf(range: DateRange): { from: string; to: string } {
  return { from: range.from.slice(0, MONTH_LENGTH), to: range.to.slice(0, MONTH_LENGTH) };
}

/**
 * Splits forecast points into two chart keys. The last historical point is repeated on the
 * projection key so the dashed segment joins the solid line without a gap.
 */
export function toForecastRows(points: readonly ForecastPoint[]): ForecastChartRow[] {
  const lastHistoryIndex = points.reduce(
    (last, point, index) => (point.forecast ? last : index),
    -1,
  );
  return points.map((point, index) => ({
    period: point.period,
    history: point.forecast ? null : Number(point.total),
    projection: point.forecast || index === lastHistoryIndex ? Number(point.total) : null,
  }));
}

export function formatPercent(value: number | null, decimals: number): string {
  return value === null ? '—' : `${value.toFixed(decimals)} %`;
}
