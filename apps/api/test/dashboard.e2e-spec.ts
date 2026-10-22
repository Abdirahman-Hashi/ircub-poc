import request from 'supertest';

import { AlertType, DASHBOARD, PaymentChannel } from '@ircub/shared';

import { SystemConfigKey } from '../src/modules/system-config/system-config.keys';
import { PrismaService } from '../src/prisma/prisma.service';

import { revenueTypeByCode } from './helpers/registry';
import { createTestApp, loginAs, SEED, type TestSession } from './helpers/test-app';
import { E2E_PORTS } from './test-env.constants';

import type { INestApplication } from '@nestjs/common';

/** Generous budget for aggregated reads on the seeded data (the bench script measures precisely). */
const BUDGET_MS = 1_500;
const DAYS_BACK = 365;
const DATE_LENGTH = 'YYYY-MM-DD'.length;
const BASELINE_DAYS = 5;
/** Synthetic baseline so that today's real collections are far below the trailing mean. */
const BASELINE_TOTALS = ['1000000000', '1100000000', '900000000', '1050000000', '950000000'];
const SSE_TIMEOUT_MS = 10_000;

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, DATE_LENGTH);
}

describe('dashboard, forecast and alerts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: TestSession;
  let supervisor: TestSession;
  const bearer = (s: TestSession): string => `Bearer ${s.accessToken}`;

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(E2E_PORTS.API);
    prisma = app.get(PrismaService);
    admin = await loginAs(app, SEED.ADMIN);
    supervisor = await loginAs(app, SEED.SUPERVISOR);
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the overview and trends from summaries within budget', async () => {
    const from = daysAgo(DAYS_BACK);
    const to = daysAgo(0);
    const startedOverview = Date.now();
    const overview = await request(app.getHttpServer())
      .get('/dashboard/overview')
      .query({ from, to })
      .set('Authorization', bearer(supervisor))
      .expect(200);
    expect(Date.now() - startedOverview).toBeLessThan(BUDGET_MS);
    expect(overview.headers['cache-control']).toBe('private, max-age=30');
    expect(Number(overview.body.collected)).toBeGreaterThan(0);
    expect(overview.body.collectedCount).toBeGreaterThan(0);

    const startedTrends = Date.now();
    const trends = await request(app.getHttpServer())
      .get('/dashboard/trends')
      .query({ from, to, groupBy: DASHBOARD.GROUP_BY.MONTH, by: DASHBOARD.BY.CHANNEL })
      .set('Authorization', bearer(supervisor))
      .expect(200);
    expect(Date.now() - startedTrends).toBeLessThan(BUDGET_MS);
    expect(trends.body.buckets.length).toBeGreaterThan(1);
    expect((trends.body.series as { key: string }[]).map((s) => s.key)).toEqual(
      expect.arrayContaining([PaymentChannel.CASH]),
    );

    const efficiency = await request(app.getHttpServer())
      .get('/dashboard/efficiency')
      .query({ from, to })
      .set('Authorization', bearer(supervisor))
      .expect(200);
    expect(efficiency.body.length).toBeGreaterThan(0);
  });

  it('projects three future months with the OLS model and two with Holt', async () => {
    const ols = await request(app.getHttpServer())
      .get('/dashboard/forecast')
      .query({ months: 3 })
      .set('Authorization', bearer(supervisor))
      .expect(200);
    expect(ols.body.model).toBe(DASHBOARD.FORECAST_MODEL.OLS);
    const series = ols.body.series[0] as {
      points: { forecast: boolean }[];
      n: number;
      caveat: string;
      r2: number | null;
    };
    expect(series.points.filter((p) => p.forecast)).toHaveLength(3);
    expect(series.n).toBe(12);
    expect(series.caveat.length).toBeGreaterThan(0);

    const holt = await request(app.getHttpServer())
      .get('/dashboard/forecast')
      .query({ months: 2, model: DASHBOARD.FORECAST_MODEL.HOLT, by: DASHBOARD.BY.REVENUE_TYPE })
      .set('Authorization', bearer(supervisor))
      .expect(200);
    expect(holt.body.series.length).toBeGreaterThan(1);
    expect(
      (holt.body.series[0] as { points: { forecast: boolean }[] }).points.filter((p) => p.forecast),
    ).toHaveLength(2);
  });

  it('raises a COLLECTION_DROP alert after a seeded drop, de-duplicates it, delivers it over SSE and acknowledges it', async () => {
    const licence = await revenueTypeByCode(app, supervisor, 'BUSINESS_LICENCE');
    await request(app.getHttpServer())
      .put(`/config/${SystemConfigKey.ANOMALY_TRAILING_DAYS}`)
      .set('Authorization', bearer(admin))
      .send({ value: BASELINE_DAYS })
      .expect(200);
    for (let back = 1; back <= BASELINE_DAYS; back += 1) {
      const date = new Date(daysAgo(back));
      const total = BASELINE_TOTALS[back - 1] ?? '0';
      await prisma.dailyCollectionSummary.upsert({
        where: {
          date_revenueTypeId_channel: {
            date,
            revenueTypeId: licence.id,
            channel: PaymentChannel.CASH,
          },
        },
        update: { total },
        create: {
          date,
          revenueTypeId: licence.id,
          channel: PaymentChannel.CASH,
          total,
          count: 1,
        },
      });
    }
    // Clear any open drop alert from an earlier run so this run raises its own.
    await prisma.alert.updateMany({
      where: { type: AlertType.COLLECTION_DROP, acknowledgedAt: null },
      data: { acknowledgedAt: new Date() },
    });

    // Subscribe before evaluating so the event is observed live.
    const controller = new AbortController();
    const stream = await fetch(
      `http://localhost:${E2E_PORTS.API}/events?access_token=${supervisor.accessToken}`,
      { signal: controller.signal },
    );
    const reader = stream.body?.getReader();
    const received = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('no alert.created event'));
      }, SSE_TIMEOUT_MS);
      let buffer = '';
      const pump = (): void => {
        reader
          ?.read()
          .then(({ value, done }) => {
            if (done) {
              return;
            }
            buffer += new TextDecoder().decode(value);
            if (buffer.includes('alert.created')) {
              clearTimeout(timer);
              resolve(buffer);
              return;
            }
            pump();
          })
          .catch(reject);
      };
      pump();
    });

    const raised = await request(app.getHttpServer())
      .post('/alerts/evaluate')
      .set('Authorization', bearer(supervisor))
      .expect(200);
    const drop = (raised.body as { type: string; severity: string; id: string }[]).find(
      (a) => a.type === AlertType.COLLECTION_DROP,
    );
    expect(drop).toBeDefined();
    const payload = await received;
    expect(payload).toContain(drop?.id ?? '');
    controller.abort();

    const again = await request(app.getHttpServer())
      .post('/alerts/evaluate')
      .set('Authorization', bearer(supervisor))
      .expect(200);
    expect(
      (again.body as { type: string }[]).some((a) => a.type === AlertType.COLLECTION_DROP),
    ).toBe(false);

    const open = await request(app.getHttpServer())
      .get('/alerts')
      .query({ acknowledged: false })
      .set('Authorization', bearer(supervisor))
      .expect(200);
    expect((open.body.items as { id: string }[]).some((a) => a.id === drop?.id)).toBe(true);
    await request(app.getHttpServer())
      .post(`/alerts/${drop?.id ?? ''}/ack`)
      .set('Authorization', bearer(supervisor))
      .expect(200);
    await request(app.getHttpServer())
      .post(`/alerts/${drop?.id ?? ''}/ack`)
      .set('Authorization', bearer(supervisor))
      .expect(409);

    // Restore the real summaries and config for the other suites.
    await request(app.getHttpServer())
      .post('/dashboard/rebuild')
      .set('Authorization', bearer(admin))
      .send({ from: daysAgo(BASELINE_DAYS), to: daysAgo(0) })
      .expect(200);
    await request(app.getHttpServer())
      .put(`/config/${SystemConfigKey.ANOMALY_TRAILING_DAYS}`)
      .set('Authorization', bearer(admin))
      .send({ value: 30 })
      .expect(200);
  });

  it('manages revenue targets by table and CSV import, and reports attainment', async () => {
    const licence = await revenueTypeByCode(app, supervisor, 'BUSINESS_LICENCE');
    const period = '2999-01';
    const set = await request(app.getHttpServer())
      .put('/targets')
      .set('Authorization', bearer(admin))
      .send({ period, revenueTypeId: licence.id, amount: '1000000.00' })
      .expect(200);
    expect(set.body.amount).toBe('1000000');
    const csv = [
      'period,revenue_type_code,amount',
      `${period},BUSINESS_LICENCE,2000000.00`,
      `${period},NOPE,1`,
      `${period},BUSINESS_LICENCE,3`,
    ].join('\n');
    const imported = await request(app.getHttpServer())
      .post('/targets/import')
      .set('Authorization', bearer(admin))
      .attach('file', Buffer.from(csv), 'targets.csv')
      .expect(201);
    expect(imported.body).toMatchObject({ accepted: 1 });
    expect(imported.body.rejected).toHaveLength(2);
    const attainment = await request(app.getHttpServer())
      .get('/dashboard/targets')
      .query({ from: period, to: period })
      .set('Authorization', bearer(supervisor))
      .expect(200);
    const row = (
      attainment.body as {
        revenueType: { code: string };
        target: string;
        attainmentPct: number | null;
      }[]
    ).find((r) => r.revenueType.code === 'BUSINESS_LICENCE');
    expect(row).toMatchObject({ target: '2000000.00', attainmentPct: 0 });
    await request(app.getHttpServer())
      .delete(`/targets/${set.body.id}`)
      .set('Authorization', bearer(admin))
      .expect(204);
  });
});
