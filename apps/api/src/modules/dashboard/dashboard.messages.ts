export const DASHBOARD_MESSAGES = {
  RANGE_INVERTED: '`from` must not be after `to`.',
  RANGE_TOO_LONG: 'Date range is too long.',
  INSUFFICIENT_HISTORY: 'Not enough monthly history to fit a forecast.',
  ALERT_NOT_FOUND: 'Alert not found.',
  ALREADY_ACKNOWLEDGED: 'Alert is already acknowledged.',
  TARGET_NOT_FOUND: 'Revenue target not found.',
  REVENUE_TYPE_NOT_FOUND: 'Revenue type not found.',
  UNKNOWN_REVENUE_TYPE: 'No revenue type with this code.',
  DUPLICATE_IN_FILE: 'This period and revenue type appear more than once in the file.',
  CAVEAT_OLS: (n: number, weak: boolean): string =>
    `Ordinary least-squares line through the last ${n} monthly totals: trend only, no seasonality or policy changes${weak ? '; the fit is weak (R² below 0.5), so treat the projection as indicative' : ''}.`,
  CAVEAT_HOLT: (n: number): string =>
    `Holt's linear exponential smoothing over the last ${n} monthly totals (α 0.5, β 0.3): reacts faster to recent months than the regression line but has no seasonality either.`,
} as const;
