import { ReadingType } from '@ircub/shared';

import { computeConsumption, evaluateAbnormal } from './readings.rules';

const meter = { maxDigits: 6, initialReading: 0 };

describe('computeConsumption', () => {
  it('NORMAL: current − previous, and rejects a reading below the previous one', () => {
    expect(
      computeConsumption({
        previousReading: 1200,
        currentReading: 1260,
        type: ReadingType.NORMAL,
        meter,
      }),
    ).toEqual({ ok: true, consumption: 60 });
    expect(
      computeConsumption({
        previousReading: 1200,
        currentReading: 1199,
        type: ReadingType.NORMAL,
        meter,
      }),
    ).toEqual({ ok: false, reason: 'READING_BELOW_PREVIOUS' });
    expect(
      computeConsumption({
        previousReading: 1200,
        currentReading: 1200,
        type: ReadingType.NORMAL,
        meter,
      }),
    ).toEqual({ ok: true, consumption: 0 });
  });

  it('ROLLOVER: (10^maxDigits − previous) + current', () => {
    expect(
      computeConsumption({
        previousReading: 999_980,
        currentReading: 35,
        type: ReadingType.ROLLOVER,
        meter,
      }),
    ).toEqual({ ok: true, consumption: 55 });
    expect(
      computeConsumption({
        previousReading: 9_990,
        currentReading: 5,
        type: ReadingType.ROLLOVER,
        meter: { maxDigits: 4, initialReading: 0 },
      }),
    ).toEqual({ ok: true, consumption: 15 });
  });

  it('ROLLOVER: rejected unless the dial actually wrapped (current below previous and within capacity)', () => {
    expect(
      computeConsumption({
        previousReading: 1200,
        currentReading: 1260,
        type: ReadingType.ROLLOVER,
        meter,
      }),
    ).toEqual({ ok: false, reason: 'READING_INVALID_ROLLOVER' });
    expect(
      computeConsumption({
        previousReading: 9_990,
        currentReading: 10_000,
        type: ReadingType.ROLLOVER,
        meter: { maxDigits: 4, initialReading: 0 },
      }),
    ).toEqual({ ok: false, reason: 'READING_INVALID_ROLLOVER' });
  });

  it('REPLACEMENT: current − new meter initial reading', () => {
    expect(
      computeConsumption({
        previousReading: 500_000,
        currentReading: 120,
        type: ReadingType.REPLACEMENT,
        meter: { maxDigits: 6, initialReading: 100 },
      }),
    ).toEqual({ ok: true, consumption: 20 });
    expect(
      computeConsumption({
        previousReading: 0,
        currentReading: 90,
        type: ReadingType.REPLACEMENT,
        meter: { maxDigits: 6, initialReading: 100 },
      }),
    ).toEqual({ ok: false, reason: 'READING_BELOW_PREVIOUS' });
  });
});

describe('evaluateAbnormal', () => {
  const history = [20, 22, 18]; // mean 20

  it('is not flagged at exactly 200 % and flagged at 201 %', () => {
    expect(evaluateAbnormal(40, history, 200, 3).abnormal).toBe(false);
    expect(evaluateAbnormal(41, history, 200, 3)).toMatchObject({ abnormal: true, mean: 20 });
    expect(evaluateAbnormal(41, history, 200, 3).reason).toContain('exceeds 200%');
  });

  it('uses fewer months when fewer exist and never flags without history', () => {
    expect(evaluateAbnormal(50, [10], 200, 3).abnormal).toBe(true);
    expect(evaluateAbnormal(15, [10], 200, 3).abnormal).toBe(false);
    expect(evaluateAbnormal(1_000, [], 200, 3)).toEqual({
      abnormal: false,
      reason: null,
      mean: null,
    });
  });

  it('only considers the configured number of most recent months', () => {
    expect(evaluateAbnormal(45, [20, 20, 20, 200, 200], 200, 3).abnormal).toBe(true);
    expect(evaluateAbnormal(45, [20, 20, 20, 200, 200], 200, 5).abnormal).toBe(false);
  });
});
