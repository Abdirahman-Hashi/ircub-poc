import { describe, expect, it } from 'vitest';

import { formatPercent, monthsOf, presetRange, toForecastRows } from './dashboard.rules';

describe('presetRange', () => {
  const now = new Date('2026-10-22T10:00:00Z');

  it('ends today and spans the preset length, or the calendar year for YTD', () => {
    expect(presetRange('30d', now)).toEqual({ from: '2026-09-23', to: '2026-10-22' });
    expect(presetRange('ytd', now)).toEqual({ from: '2026-01-01', to: '2026-10-22' });
    expect(monthsOf(presetRange('12m', now))).toEqual({ from: '2025-10', to: '2026-10' });
  });
});

describe('toForecastRows', () => {
  it('puts history and projection on separate keys and joins them at the last actual point', () => {
    const rows = toForecastRows([
      { period: '2026-08', total: '10', forecast: false },
      { period: '2026-09', total: '12', forecast: false },
      { period: '2026-10', total: '14', forecast: true },
    ]);
    expect(rows).toEqual([
      { period: '2026-08', history: 10, projection: null },
      { period: '2026-09', history: 12, projection: 12 },
      { period: '2026-10', history: null, projection: 14 },
    ]);
  });

  it('formats percentages with a dash for missing values', () => {
    expect(formatPercent(12.345, 1)).toBe('12.3 %');
    expect(formatPercent(null, 1)).toBe('—');
  });
});
