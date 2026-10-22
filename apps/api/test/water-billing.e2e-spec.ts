import { addDays, subDays } from 'date-fns';
import request from 'supertest';

import {
  BillingCycleStatus,
  BillStatus,
  ErrorCode,
  PaymentChannel,
  ReadingType,
} from '@ircub/shared';

import { registerPayer } from './helpers/registry';
import { createTestApp, loginAs, SEED, type TestSession } from './helpers/test-app';

import type { INestApplication } from '@nestjs/common';

/** Dedicated tariff + account + meter per run so the suite is independent of seeded water data. */
describe('water billing (e2e)', () => {
  let app: INestApplication;
  let admin: TestSession;
  let water: TestSession;
  let officer: TestSession;
  let accountId: string;
  let meterId: string;
  let meterSerial: string;
  let cycleId: string;
  let period: string;
  let billId: string;

  const day = (date: Date): string => date.toISOString().slice(0, 'YYYY-MM-DD'.length);
  // A past period unique per run: the cycle then bills only this suite's account and never
  // collides with a cycle released by an earlier run on the same database.
  const runStamp = Date.now();
  const base = new Date(
    Date.UTC(1980 + Math.floor((runStamp / 60_000) % 40), Math.floor((runStamp / 1_000) % 12), 15),
  );
  const bearer = (s: TestSession): string => `Bearer ${s.accessToken}`;

  beforeAll(async () => {
    app = await createTestApp();
    admin = await loginAs(app, SEED.ADMIN);
    water = await loginAs(app, SEED.WATER);
    officer = await loginAs(app, SEED.OFFICER);

    const stamp = Date.now();
    const tariff = await request(app.getHttpServer())
      .post('/tariffs')
      .set('Authorization', bearer(admin))
      .send({
        code: `E2E_${stamp}`,
        name: 'E2E tariff',
        fixedCharge: '500.00',
        tiers: [
          { fromUnit: 0, toUnit: 10, ratePerUnit: '100.00' },
          { fromUnit: 10, toUnit: null, ratePerUnit: '200.00' },
        ],
      })
      .expect(201);
    const payer = await registerPayer(app, officer);
    meterSerial = `MTR-E2E-${stamp}`;
    const account = await request(app.getHttpServer())
      .post('/water-accounts')
      .set('Authorization', bearer(water))
      .send({
        payerId: payer.id,
        tariffCategoryId: tariff.body.id,
        serviceAddress: 'E2E street 1',
        meterSerial,
        initialReading: 1000,
      })
      .expect(201);
    accountId = account.body.id as string;
    meterId = account.body.meters[0].id as string;
    expect(account.body.accountNumber).toMatch(/^WA\d{8}$/);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects invalid tiers and enforces the reading rules', async () => {
    const bad = await request(app.getHttpServer())
      .post('/tariffs')
      .set('Authorization', bearer(admin))
      .send({
        code: `BAD_${Date.now()}`,
        name: 'Bad',
        fixedCharge: '0',
        tiers: [{ fromUnit: 5, toUnit: null, ratePerUnit: '1' }],
      })
      .expect(400);
    expect(bad.body.code).toBe(ErrorCode.TARIFF_TIERS_INVALID);

    const below = await request(app.getHttpServer())
      .post('/readings')
      .set('Authorization', bearer(water))
      .send({ meterId, readingDate: day(subDays(new Date(), 60)), readingValue: 900 })
      .expect(422);
    expect(below.body.code).toBe(ErrorCode.READING_BELOW_PREVIOUS);

    const future = await request(app.getHttpServer())
      .post('/readings')
      .set('Authorization', bearer(water))
      .send({ meterId, readingDate: day(addDays(new Date(), 5)), readingValue: 1100 })
      .expect(400);
    expect(future.body.code).toBe(ErrorCode.READING_IN_FUTURE);
  });

  it('imports readings from CSV with per-row rejections', async () => {
    const d1 = day(subDays(base, 50));
    const d2 = day(subDays(base, 40));
    const csv = [
      'meter_serial,reading_date,reading_value,type',
      `${meterSerial},${d1},1020,NORMAL`, // +20
      `${meterSerial},${d2},1045,`, // +25, type defaults to NORMAL
      `MTR-NOPE,${d2},10,NORMAL`, // unknown meter
      `${meterSerial},${d2},1050,NORMAL`, // duplicate date within file
      `${meterSerial},${day(subDays(base, 30))},1000,NORMAL`, // below previous (1045)
      `${meterSerial},${day(subDays(base, 30))},1060,SIDEWAYS`, // schema: bad type
    ].join('\n');
    const dry = await request(app.getHttpServer())
      .post('/bulk-uploads/meter-readings')
      .query({ dryRun: 'true' })
      .set('Authorization', bearer(water))
      .attach('file', Buffer.from(csv), 'readings.csv')
      .expect(201);
    expect(dry.body).toMatchObject({ totalRows: 6, accepted: 2, dryRun: true });
    expect(
      (dry.body.rejected as { row: number; reason: string }[]).map((r) => `${r.row}:${r.reason}`),
    ).toEqual(['4:UNKNOWN_METER', '5:DUPLICATE_DATE', '6:READING_BELOW_PREVIOUS', '7:SCHEMA']);

    const real = await request(app.getHttpServer())
      .post('/bulk-uploads/meter-readings')
      .set('Authorization', bearer(water))
      .attach('file', Buffer.from(csv), 'readings.csv')
      .expect(201);
    expect(real.body.accepted).toBe(2);
    const readings = await request(app.getHttpServer())
      .get('/readings')
      .query({ meterId })
      .set('Authorization', bearer(water))
      .expect(200);
    expect(readings.body.total).toBe(2);
    expect(
      (readings.body.items as { consumption: number }[]).map((r) => r.consumption).sort(),
    ).toEqual([20, 25]);
  });

  it('flags an abnormal reading, runs the cycle, blocks release until cleared, then releases with PDF and notifications', async () => {
    // Third reading, this month, 3.5× the average → abnormal → bill FLAGGED.
    const readingDate = base;
    period = `${readingDate.getUTCFullYear()}-${String(readingDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const preview = await request(app.getHttpServer())
      .post('/readings/preview')
      .set('Authorization', bearer(water))
      .send({ meterId, readingDate: day(readingDate), readingValue: 1045 + 80 })
      .expect(200);
    expect(preview.body).toMatchObject({ previousReading: 1045, consumption: 80, abnormal: true });

    await request(app.getHttpServer())
      .post('/readings')
      .set('Authorization', bearer(water))
      .send({
        meterId,
        readingDate: day(readingDate),
        readingValue: 1125,
        type: ReadingType.NORMAL,
      })
      .expect(201);

    const run = await request(app.getHttpServer())
      .post('/billing-cycles')
      .set('Authorization', bearer(water))
      .send({ period })
      .expect(201);
    cycleId = run.body.id as string;
    expect(run.body.status).toBe(BillingCycleStatus.REVIEW);
    expect(run.body.stats.billed).toBe(1);
    expect(run.body.stats.skipped.length).toBeGreaterThan(0); // seeded accounts have no reading in this period

    const bills = await request(app.getHttpServer())
      .get('/bills')
      .query({ cycleId, accountId })
      .set('Authorization', bearer(water))
      .expect(200);
    const bill = bills.body.items[0];
    billId = bill.id as string;
    expect(bill.status).toBe(BillStatus.FLAGGED);
    expect(bill.consumption).toBe(80);
    // 10 × 100 + 70 × 200 = 15000 + fixed 500 + arrears 0
    expect((bill.tierBreakdown as { units: number }[]).map((l) => l.units)).toEqual([10, 70]);
    expect(bill.totalDue).toBe('15500');

    const blocked = await request(app.getHttpServer())
      .post(`/billing-cycles/${cycleId}/release`)
      .set('Authorization', bearer(water))
      .expect(409);
    expect(blocked.body.code).toBe(ErrorCode.BILLING_CYCLE_HAS_FLAGGED_BILLS);

    // Confirming the flag holds the bill back: the cycle can go out without it.
    await request(app.getHttpServer())
      .post(`/bills/${billId}/confirm-flag`)
      .set('Authorization', bearer(water))
      .send({ note: 'Investigate on site' })
      .expect(201);
    const released = await request(app.getHttpServer())
      .post(`/billing-cycles/${cycleId}/release`)
      .set('Authorization', bearer(water))
      .expect(201);
    expect(released.body.status).toBe(BillingCycleStatus.RELEASED);
    expect(released.body.stats.held).toBe(1);
    const held = await request(app.getHttpServer())
      .get(`/bills/${billId}`)
      .set('Authorization', bearer(water))
      .expect(200);
    expect(held.body).toMatchObject({
      status: BillStatus.FLAGGED,
      flagged: true,
      releasedAt: null,
    });

    // Clearing the flag after the cycle went out releases the held bill on its own.
    const cleared = await request(app.getHttpServer())
      .post(`/bills/${billId}/clear-flag`)
      .set('Authorization', bearer(water))
      .send({ note: 'Verified on site' })
      .expect(201);
    expect(cleared.body).toMatchObject({ status: BillStatus.RELEASED, flagged: false });
    expect(cleared.body.releasedAt).not.toBeNull();
    const notFlagged = await request(app.getHttpServer())
      .post(`/bills/${billId}/clear-flag`)
      .set('Authorization', bearer(water))
      .send({ note: 'again' })
      .expect(409);
    expect(notFlagged.body.code).toBe(ErrorCode.BILL_NOT_FLAGGED);
    const cycleAfter = await request(app.getHttpServer())
      .get(`/billing-cycles/${cycleId}`)
      .set('Authorization', bearer(water))
      .expect(200);
    expect(cycleAfter.body.stats.held).toBe(0);

    const pdf = await request(app.getHttpServer())
      .get(`/bills/${billId}/pdf`)
      .set('Authorization', bearer(water))
      .expect(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');

    // The release job renders the PDF and records notification rows (SENT or FAILED, depending on the mock gateway).
    let notifications: { total: number } = { total: 0 };
    for (let attempt = 0; attempt < 60 && notifications.total === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .query({ relatedType: 'Bill', relatedId: billId })
        .set('Authorization', bearer(water))
        .expect(200);
      notifications = res.body as { total: number };
    }
    expect(notifications.total).toBeGreaterThanOrEqual(1);

    const rerun = await request(app.getHttpServer())
      .post('/billing-cycles')
      .set('Authorization', bearer(water))
      .send({ period })
      .expect(409);
    expect(rerun.body.code).toBe(ErrorCode.BILLING_CYCLE_INVALID_STATE);
  });

  it('accepts a payment against the bill control number and shows it on the statement with a running balance', async () => {
    const bill = await request(app.getHttpServer())
      .get(`/bills/${billId}`)
      .set('Authorization', bearer(water))
      .expect(200);
    const lookup = await request(app.getHttpServer())
      .get('/payments/capture/lookup')
      .query({ controlNumber: bill.body.billNumber })
      .set('Authorization', bearer(officer))
      .expect(200);
    expect(lookup.body.kind).toBe('BILL');
    expect(lookup.body.outstanding).toBe('15500');

    await request(app.getHttpServer())
      .post('/payments/capture')
      .set('Authorization', bearer(officer))
      .send({
        controlNumber: bill.body.billNumber,
        amount: '5500.00',
        currency: 'SOS',
        channel: PaymentChannel.CASH,
      })
      .expect(201);
    const after = await request(app.getHttpServer())
      .get(`/bills/${billId}`)
      .set('Authorization', bearer(water))
      .expect(200);
    expect(after.body).toMatchObject({
      status: BillStatus.PART_PAID,
      paidAmount: '5500',
      outstanding: '10000',
    });

    const statement = await request(app.getHttpServer())
      .get(`/water-accounts/${accountId}/statement`)
      .set('Authorization', bearer(water))
      .expect(200);
    const kinds = (statement.body.lines as { kind: string; balance: string }[]).map(
      (l) => `${l.kind}:${l.balance}`,
    );
    expect(kinds).toEqual(['OPENING:0', 'BILL:15500', 'PAYMENT:10000']);
    expect(statement.body.closingBalance).toBe('10000');

    const pdf = await request(app.getHttpServer())
      .get(`/water-accounts/${accountId}/statement.pdf`)
      .set('Authorization', bearer(water))
      .expect(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
  });

  it('rejects a ROLLOVER that did not wrap the dial', async () => {
    const res = await request(app.getHttpServer())
      .post('/readings')
      .set('Authorization', bearer(water))
      .send({
        meterId,
        readingDate: day(new Date()),
        readingValue: 1300,
        type: ReadingType.ROLLOVER,
      })
      .expect(422);
    expect(res.body.code).toBe(ErrorCode.READING_INVALID_ROLLOVER);
  });

  it('replaces a meter, closing the old one with a final reading, and counts the first reading from the new initial reading', async () => {
    const replaced = await request(app.getHttpServer())
      .post(`/meters/${meterId}/replace`)
      .set('Authorization', bearer(water))
      .send({ newSerial: `${meterSerial}-B`, initialReading: 50, finalReading: 1130 })
      .expect(201);
    expect(replaced.body.replacesMeterId).toBe(meterId);
    const closing = await request(app.getHttpServer())
      .get('/readings')
      .query({ meterId, sort: 'readingDate:desc', pageSize: 1 })
      .set('Authorization', bearer(water))
      .expect(200);
    expect(closing.body.items[0]).toMatchObject({ readingValue: 1130, consumption: 5 });
    const reading = await request(app.getHttpServer())
      .post('/readings')
      .set('Authorization', bearer(water))
      .send({
        meterId: replaced.body.id,
        readingDate: day(new Date()),
        readingValue: 62,
        type: ReadingType.REPLACEMENT,
      })
      .expect(201);
    expect(reading.body.consumption).toBe(12);

    const oldMeter = await request(app.getHttpServer())
      .post('/readings')
      .set('Authorization', bearer(water))
      .send({ meterId, readingDate: day(new Date()), readingValue: 1200 })
      .expect(409);
    expect(oldMeter.body.code).toBe(ErrorCode.METER_NOT_ACTIVE);
  });
});
