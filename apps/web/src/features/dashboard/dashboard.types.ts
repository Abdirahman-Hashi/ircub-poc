import type { RANGE_PRESETS } from './dashboard.constants';

export type RangePreset = (typeof RANGE_PRESETS)[number]['value'];

export interface DateRange {
  readonly from: string;
  readonly to: string;
}

/** A forecast chart row: history and projection as separate keys so the projection draws dashed. */
export interface ForecastChartRow {
  readonly period: string;
  readonly history: number | null;
  readonly projection: number | null;
}
