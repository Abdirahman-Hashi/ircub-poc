import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Decimal } from 'decimal.js';
import request from 'supertest';

import { createTestApp, loginAs, SEED, type TestSession } from './helpers/test-app';

import type { INestApplication } from '@nestjs/common';

const SAMPLE = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'docs',
  'samples',
  'revenue-transactions.sample.csv',
);

describe('bulk upload (e2e)', () => {
  let app: INestApplication;
  let officer: TestSession;

  beforeAll(async () => {
    app = await createTestApp();
    officer = await loginAs(app, SEED.OFFICER);
  });

  afterAll(async () => {
    await app.close();
  });

  const bearer = (s: TestSession): string => `Bearer ${s.accessToken}`;

  /** Channel references must be unique in the database; suffix them per run (keeps the in-file duplicate a duplicate). */
  const sampleForThisRun = (): Buffer => {
    const suffix = `-${Date.now()}`;
    const text = readFileSync(SAMPLE, 'utf8').replace(
      /(BNK|MM)-SAMPLE-(\d{3})/g,
      `$1-SAMPLE-$2${suffix}`,
    );
    return Buffer.from(text, 'utf8');
  };

  it('dry run reports 16 accepted and 4 rejected rows with reasons, persisting nothing', async () => {
    const res = await request(app.getHttpServer())
      .post('/bulk-uploads/revenue-transactions')
      .query({ dryRun: 'true' })
      .set('Authorization', bearer(officer))
      .attach('file', sampleForThisRun(), 'revenue-transactions.sample.csv')
      .expect(201);

    expect(res.body).toMatchObject({ totalRows: 20, accepted: 16, dryRun: true });
    expect(res.body.uploadId).toBeUndefined();
    const reasons = (res.body.rejected as { row: number; reason: string }[]).map(
      (r) => `${r.row}:${r.reason}`,
    );
    expect(reasons).toEqual([
      '18:INVALID_CONTROL_NUMBER',
      '19:UNKNOWN_ASSESSMENT',
      '20:OVERPAYMENT',
      '21:DUPLICATE_TXN_REF_IN_FILE',
    ]);
  });

  it('imports the sample: 16 CONFIRMED payments, 4 rejections, upload stored with its summary', async () => {
    const res = await request(app.getHttpServer())
      .post('/bulk-uploads/revenue-transactions')
      .set('Authorization', bearer(officer))
      .attach('file', sampleForThisRun(), 'revenue-transactions.sample.csv')
      .expect(201);

    expect(res.body).toMatchObject({ totalRows: 20, accepted: 16, dryRun: false });
    expect(res.body.rejected).toHaveLength(4);
    const uploadId = res.body.uploadId as string;

    const stored = await request(app.getHttpServer())
      .get(`/bulk-uploads/${uploadId}`)
      .set('Authorization', bearer(officer))
      .expect(200);
    expect(stored.body).toMatchObject({ accepted: 16, rejected: 4, totalRows: 20 });
    expect(stored.body.summary.rejected).toHaveLength(4);

    const payments = await request(app.getHttpServer())
      .get('/payments')
      .query({ bulkUploadId: uploadId, pageSize: 50 })
      .set('Authorization', bearer(officer))
      .expect(200);
    const fromUpload = payments.body.items as {
      currency: string;
      localAmount: string;
      status: string;
      fxRate: string;
    }[];
    expect(payments.body.total).toBe(16);
    expect(fromUpload.every((p) => p.status === 'CONFIRMED')).toBe(true);
    const usdRow = fromUpload.find((p) => p.currency === 'USD');
    // 2 USD at the rate the row was converted with (live when the mock FX is up, stored otherwise).
    expect(usdRow?.localAmount).toBe(
      new Decimal(usdRow?.fxRate ?? '0')
        .mul(2)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)
        .toFixed(),
    );
  });

  it('rejects a file with missing columns and a non-CSV upload', async () => {
    const missing = await request(app.getHttpServer())
      .post('/bulk-uploads/revenue-transactions')
      .set('Authorization', bearer(officer))
      .attach('file', Buffer.from('control_number,amount\n1,2\n'), 'bad.csv')
      .expect(422);
    expect(missing.body.code).toBe('CSV_INVALID');
    expect(missing.body.details.missing).toContain('currency');

    await request(app.getHttpServer())
      .post('/bulk-uploads/revenue-transactions')
      .set('Authorization', bearer(officer))
      .attach('file', Buffer.from('%PDF-1.4'), 'file.pdf')
      .expect(415);
  });

  it('serves the template', async () => {
    const res = await request(app.getHttpServer())
      .get('/bulk-uploads/template.csv')
      .set('Authorization', bearer(officer))
      .expect(200);
    expect(res.text.trim()).toBe(
      'control_number,amount,currency,channel,channel_txn_ref,paid_at,captured_by_email',
    );
  });
});
