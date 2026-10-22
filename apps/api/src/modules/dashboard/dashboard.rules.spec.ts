import { AlertSeverity, Currency, DASHBOARD, PaymentChannel } from '@ircub/shared';

import {
  aggregateBilling,
  aggregateCollections,
  anomalyVerdict,
  bucketKey,
  buildTrends,
  dayFraction,
  holtForecast,
  nextPeriods,
  olsForecast,
  percent,
  periodsBetween,
  sameRangeLastYear,
  zScore,
} from './dashboard.rules';

const payment = (
  paidAt: string,
  amount: string,
  channel: PaymentChannel = PaymentChannel.CASH,
  type = 'rt-a',
) => ({
  paidAt: new Date(paidAt),
  localAmount: amount,
  currency: Currency.SOS,
  channel,
  revenueTypeId: type,
});

describe('aggregateCollections', () => {
  it('sums per day, revenue type and channel and books reversals on their decision day', () => {
    const rows = aggregateCollections(
      [
        payment('2026-10-01T09:00:00Z', '100.00'),
        payment('2026-10-01T15:00:00Z', '50.50'),
        payment('2026-10-01T15:00:00Z', '7.00', PaymentChannel.BANK),
        payment('2026-10-02T15:00:00Z', '1.00'),
      ],
      [
        {
          decidedAt: new Date('2026-10-02T10:00:00Z'),
          localAmount: '100.00',
          channel: PaymentChannel.CASH,
          revenueTypeId: 'rt-a',
        },
      ],
    );
    const byKey = new Map(rows.map((r) => [`${r.date}|${r.channel}`, r]));
    expect(byKey.get('2026-10-01|CASH')).toMatchObject({
      total: '150.50',
      count: 2,
      reversedTotal: '0.00',
      reversedCount: 0,
    });
    expect(byKey.get('2026-10-01|BANK')).toMatchObject({ total: '7.00', count: 1 });
    expect(byKey.get('2026-10-02|CASH')).toMatchObject({
      total: '1.00',
      count: 1,
      reversedTotal: '100.00',
      reversedCount: 1,
    });
    expect(rows).toHaveLength(3);
  });

  it('aggregates water billed by period end and collected by paid day', () => {
    const rows = aggregateBilling(
      [
        { periodEnd: new Date('2026-09-30T00:00:00Z'), totalDue: '40' },
        { periodEnd: new Date('2026-09-30T00:00:00Z'), totalDue: '60' },
      ],
      [
        { paidAt: new Date('2026-09-30T12:00:00Z'), localAmount: '25' },
        { paidAt: new Date('2026-10-05T12:00:00Z'), localAmount: '10' },
      ],
    );
    expect(rows).toEqual(
      expect.arrayContaining([
        { date: '2026-09-30', billedTotal: '100.00', collectedTotal: '25.00' },
        { date: '2026-10-05', billedTotal: '0.00', collectedTotal: '10.00' },
      ]),
    );
  });
});

describe('trends', () => {
  it('buckets by day, ISO week and month', () => {
    const date = new Date('2026-01-01T12:00:00Z'); // Thursday of ISO week 1
    expect(bucketKey(date, DASHBOARD.GROUP_BY.DAY)).toBe('2026-01-01');
    expect(bucketKey(date, DASHBOARD.GROUP_BY.WEEK)).toBe('2026-W01');
    expect(bucketKey(date, DASHBOARD.GROUP_BY.MONTH)).toBe('2026-01');
  });

  it('builds one series per key on shared buckets, zero-filled', () => {
    const rows = [
      {
        date: new Date('2026-10-01'),
        revenueTypeId: 'a',
        channel: PaymentChannel.CASH,
        total: '10',
        count: 1,
      },
      {
        date: new Date('2026-10-02'),
        revenueTypeId: 'b',
        channel: PaymentChannel.BANK,
        total: '5',
        count: 1,
      },
      {
        date: new Date('2026-10-02'),
        revenueTypeId: 'a',
        channel: PaymentChannel.BANK,
        total: '2',
        count: 1,
      },
    ];
    const byType = buildTrends(rows, {
      groupBy: DASHBOARD.GROUP_BY.DAY,
      by: DASHBOARD.BY.REVENUE_TYPE,
      labels: new Map([
        ['a', 'Alpha'],
        ['b', 'Beta'],
      ]),
    });
    expect(byType.buckets).toEqual(['2026-10-01', '2026-10-02']);
    expect(byType.series.map((s) => s.label)).toEqual(['Alpha', 'Beta']);
    expect(byType.series[0]?.points).toEqual([
      { bucket: '2026-10-01', total: '10.00', count: 1 },
      { bucket: '2026-10-02', total: '2.00', count: 1 },
    ]);
    const byChannel = buildTrends(rows, {
      groupBy: DASHBOARD.GROUP_BY.MONTH,
      by: DASHBOARD.BY.CHANNEL,
      labels: new Map(),
    });
    expect(byChannel.series.find((s) => s.key === PaymentChannel.BANK)?.points).toEqual([
      { bucket: '2026-10', total: '7.00', count: 2 },
    ]);
  });
});

describe('forecast', () => {
  const linear = Array.from({ length: 12 }, (_, i) => ({
    period: `2025-${String(i + 1).padStart(2, '0')}`,
    total: 1000 + 100 * i,
  }));

  it('fits an exact linear series with slope 100, intercept 1000 and r2 1', () => {
    const fit = olsForecast(linear, 3);
    expect(fit).not.toBeNull();
    expect(fit?.slope).toBeCloseTo(100, 6);
    expect(fit?.intercept).toBeCloseTo(1000, 6);
    expect(fit?.r2).toBeCloseTo(1, 6);
    expect(fit?.projected.map((p) => p.period)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(fit?.projected[0]?.total).toBeCloseTo(2200, 6);
  });

  it('refuses fewer than three points and never projects below zero', () => {
    expect(olsForecast(linear.slice(0, 2), 3)).toBeNull();
    const falling = [
      { period: '2026-01', total: 30 },
      { period: '2026-02', total: 20 },
      { period: '2026-03', total: 10 },
    ];
    expect(olsForecast(falling, 2)?.projected.map((p) => p.total)).toEqual([0, 0]);
  });

  it("Holt's smoothing follows a known linear series and reports level and trend", () => {
    const fit = holtForecast(linear, 2, 0.5, 0.3);
    expect(fit).not.toBeNull();
    expect(fit?.slope).toBeCloseTo(100, 3);
    expect(fit?.intercept).toBeCloseTo(2100, 3);
    expect(fit?.projected.map((p) => Math.round(p.total))).toEqual([2200, 2300]);
    expect(fit?.r2).toBeNull();
  });

  it('enumerates periods', () => {
    expect(nextPeriods('2026-11', 3)).toEqual(['2026-12', '2027-01', '2027-02']);
    expect(periodsBetween('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });
});

describe('anomalies', () => {
  const samples = [100, 110, 90, 105, 95, 100, 100];

  it('computes a z-score and guards against no spread or too few samples', () => {
    expect(zScore(100, samples, 5)).toBeCloseTo(0, 6);
    expect(zScore(50, [100, 100, 100, 100, 100], 5)).toBeNull();
    expect(zScore(50, samples.slice(0, 3), 5)).toBeNull();
  });

  it('flags drops at the thresholds in the right direction only', () => {
    const sd = 6.455; // sample standard deviation of `samples`
    const at = (z: number): number => 100 + z * sd;
    expect(anomalyVerdict(at(-1.9), samples, -1, 2, 3, 5).severity).toBeNull();
    expect(anomalyVerdict(at(-2.1), samples, -1, 2, 3, 5).severity).toBe(AlertSeverity.WARNING);
    expect(anomalyVerdict(at(-3.1), samples, -1, 2, 3, 5).severity).toBe(AlertSeverity.CRITICAL);
    expect(anomalyVerdict(at(3.1), samples, -1, 2, 3, 5).severity).toBeNull();
    expect(anomalyVerdict(at(2.1), samples, 1, 2, 3, 5).severity).toBe(AlertSeverity.WARNING);
    expect(anomalyVerdict(100, [100, 100, 100, 100, 100], -1, 2, 3, 5)).toEqual({
      z: null,
      mean: 100,
      severity: null,
    });
  });

  it('scales baselines by the fraction of the day elapsed', () => {
    expect(dayFraction(new Date('2026-10-22T12:00:00Z'))).toBeCloseTo(0.5, 6);
    expect(dayFraction(new Date('2026-10-22T00:00:00Z'))).toBe(0);
  });
});

describe('helpers', () => {
  it('percent and last-year range', () => {
    expect(percent('25', '200')).toBe(12.5);
    expect(percent('25', '0')).toBeNull();
    expect(sameRangeLastYear('2026-02-28', '2026-03-31')).toEqual({
      from: '2025-02-28',
      to: '2025-03-31',
    });
  });
});
