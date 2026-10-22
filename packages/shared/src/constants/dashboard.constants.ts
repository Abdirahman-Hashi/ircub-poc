/** Dashboard query vocabulary shared by api and web (D18). */
export const DASHBOARD = {
  GROUP_BY: { DAY: 'day', WEEK: 'week', MONTH: 'month' },
  BY: { REVENUE_TYPE: 'revenueType', CHANNEL: 'channel' },
  FORECAST_MODEL: { OLS: 'ols-linear', HOLT: 'holt-linear' },
  /** Period key format for targets and monthly series. */
  PERIOD_PATTERN: /^\d{4}-(0[1-9]|1[0-2])$/,
  DATE_PATTERN: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
} as const;

export type DashboardGroupBy = (typeof DASHBOARD.GROUP_BY)[keyof typeof DASHBOARD.GROUP_BY];
export type DashboardBy = (typeof DASHBOARD.BY)[keyof typeof DASHBOARD.BY];
export type ForecastModel =
  (typeof DASHBOARD.FORECAST_MODEL)[keyof typeof DASHBOARD.FORECAST_MODEL];

export const DASHBOARD_GROUP_BY_VALUES = Object.values(DASHBOARD.GROUP_BY);
export const DASHBOARD_BY_VALUES = Object.values(DASHBOARD.BY);
export const FORECAST_MODEL_VALUES = Object.values(DASHBOARD.FORECAST_MODEL);
