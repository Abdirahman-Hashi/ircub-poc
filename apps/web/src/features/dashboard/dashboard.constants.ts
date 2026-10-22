import { AlertSeverity, DASHBOARD } from '@ircub/shared';

export const DASHBOARD_UI = {
  /** KPI cards refresh on this interval; SSE events also invalidate them. */
  REFRESH_MS: 60_000,
  CHART_HEIGHT: 280,
  ALERTS_PAGE_SIZE: 20,
  TARGETS_FILE_NAME: 'revenue-targets-template.csv',
  DEFAULT_PRESET: '30d',
  DEFAULT_FORECAST_MODEL: DASHBOARD.FORECAST_MODEL.OLS,
  PERCENT_DECIMALS: 1,
  PERCENT: 100,
  /** R² at or above this reads as a usable trend (mirrors the API's weak-fit threshold). */
  GOOD_R2: 0.5,
} as const;

export const RANGE_PRESETS = [
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: 'ytd', label: 'Year to date', days: null },
  { value: '12m', label: 'Last 12 months', days: 365 },
] as const;

export const SERIES_COLORS = [
  'var(--mantine-color-teal-6)',
  'var(--mantine-color-blue-6)',
  'var(--mantine-color-orange-6)',
  'var(--mantine-color-grape-6)',
  'var(--mantine-color-red-6)',
  'var(--mantine-color-lime-6)',
  'var(--mantine-color-cyan-6)',
] as const;

export const SEVERITY_COLORS: Readonly<Record<string, string>> = {
  [AlertSeverity.INFO]: 'blue',
  [AlertSeverity.WARNING]: 'orange',
  [AlertSeverity.CRITICAL]: 'red',
};

export const DEFAULT_SEVERITY_COLOR = 'gray';
