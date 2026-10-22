import { Decimal } from 'decimal.js';

import { Currency, ErrorCode } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { SystemConfigKey } from '../system-config/system-config.keys';

import { FxService } from './fx.service';

import type { FxRateProvider } from './fx.types';
import type { PrismaService } from '../../prisma/prisma.service';
import type { SystemConfigService } from '../system-config/system-config.service';

/** Hand-rolled fakes: only the three calls FxService makes. */
function build(options: {
  providerFails: boolean;
  storedAsOf: Date | null;
  staleAfterMinutes?: number;
}) {
  const created: unknown[] = [];
  const prisma = {
    fxRate: {
      create: jest.fn((args: unknown) => {
        created.push(args);
        return Promise.resolve({});
      }),
      findFirst: jest.fn(() =>
        Promise.resolve(
          options.storedAsOf === null
            ? null
            : {
                base: Currency.USD,
                quote: Currency.SOS,
                rate: new Decimal('570.1'),
                asOf: options.storedAsOf,
                source: 'seed',
              },
        ),
      ),
      findMany: jest.fn(() => Promise.resolve([])),
    },
  } as unknown as PrismaService;
  const systemConfig = {
    get: jest.fn((key: SystemConfigKey) =>
      Promise.resolve(
        key === SystemConfigKey.LOCAL_CURRENCY ? Currency.SOS : (options.staleAfterMinutes ?? 60),
      ),
    ),
  } as unknown as SystemConfigService;
  const provider: FxRateProvider = {
    fetch: jest.fn(() =>
      options.providerFails
        ? Promise.reject(new Error('ECONNREFUSED'))
        : Promise.resolve({
            base: Currency.USD,
            rates: { USD: 1, SOS: 571.4999994 },
            asOf: new Date('2026-10-22T09:00:00Z'),
          }),
    ),
  };
  const scheduler = { addInterval: jest.fn() };
  return { service: new FxService(prisma, systemConfig, provider, scheduler as never), created };
}

describe('FxService.getRate', () => {
  it('stores the provider quote (rounded to 6 dp) and returns it fresh', async () => {
    const { service, created } = build({ providerFails: false, storedAsOf: null });
    const rate = await service.getRate(Currency.USD, Currency.SOS);
    expect(rate.rate.toFixed()).toBe('571.499999');
    expect(rate.stale).toBe(false);
    expect(created).toHaveLength(1);
  });

  it('falls back to the latest stored rate when the provider is down, flagging stale only past the window', async () => {
    const recent = build({ providerFails: true, storedAsOf: new Date(Date.now() - 5 * 60_000) });
    const fresh = await recent.service.getRate(Currency.USD, Currency.SOS);
    expect(fresh.rate.toFixed()).toBe('570.1');
    expect(fresh.stale).toBe(false);

    const old = build({ providerFails: true, storedAsOf: new Date(Date.now() - 3 * 60 * 60_000) });
    const stale = await old.service.getRate(Currency.USD, Currency.SOS);
    expect(stale.stale).toBe(true);
  });

  it('fails with FX_RATE_UNAVAILABLE when the provider is down and nothing is stored', async () => {
    const { service } = build({ providerFails: true, storedAsOf: null });
    await expect(service.getRate(Currency.USD, Currency.SOS)).rejects.toMatchObject({
      code: ErrorCode.FX_RATE_UNAVAILABLE,
    });
    await expect(service.getRate(Currency.USD, Currency.SOS)).rejects.toBeInstanceOf(AppException);
  });

  it('converts foreign amounts with the retrieved rate, HALF_EVEN to 2 dp', async () => {
    const { service } = build({ providerFails: false, storedAsOf: null });
    const result = await service.toLocal(new Decimal('10'), Currency.USD);
    expect(result.localAmount.toFixed()).toBe('5715');
    expect(result.fxRate.toFixed()).toBe('571.499999');
    const local = await service.toLocal(new Decimal('12.345'), Currency.SOS);
    expect(local.localAmount.toFixed()).toBe('12.34');
    expect(local.fxRate.toFixed()).toBe('1');
  });
});
