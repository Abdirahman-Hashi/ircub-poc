import './helpers/channels-env';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

import {
  type AssessmentView,
  Currency,
  ErrorCode,
  FmisReconciliationStatus,
  JournalBatchKind,
  JournalBatchStatus,
  PaymentChannel,
} from '@ircub/shared';

import { AppModule as MocksAppModule } from '../../mocks/src/app.module';
import { SystemConfigKey } from '../src/modules/system-config/system-config.keys';

import { createAssessment, registerPayer, revenueTypeByCode } from './helpers/registry';
import { createTestApp, loginAs, SEED, type TestSession } from './helpers/test-app';
import { E2E_PORTS } from './test-env.constants';

import type { INestApplication } from '@nestjs/common';

const POLL_MS = 500;
const POST_TIMEOUT_MS = 20_000;
const FAIL_TIMEOUT_MS = 40_000;
const SHORT_DELAY_SECONDS = 1;
/** Seeded GL mappings are effective from 1970, and payments cannot be dated in the future. */
const YEAR_BASE = 1971;
const YEAR_SPAN = 50;
const MONTHS = 12;

async function waitFor<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  timeoutMs: number,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last = await read();
  while (!done(last) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    last = await read();
  }
  return last;
}

describe('fmis posting and reconciliation (e2e)', () => {
  let mocks: INestApplication;
  let app: INestApplication;
  let admin: TestSession;
  let officer: TestSession;
  let supervisor: TestSession;
  let assessment: AssessmentView;
  // Unique past days per run so the one-batch-per-day rule does not trip on earlier runs.
  const stamp = Date.now();
  const month = `${YEAR_BASE + (stamp % YEAR_SPAN)}-${String(1 + (stamp % MONTHS)).padStart(2, '0')}`;
  const day = `${month}-${String(1 + (stamp % MONTHS)).padStart(2, '0')}`;
  /** Day whose number ends in 13 → the mock FMIS fails the posting. */
  const FAILING_DAY = `${month}-13`;
  const CLEAN_DAY = `${month}-14`;
  const CATCH_UP_DAY = `${month}-20`;

  const bearer = (s: TestSession): string => `Bearer ${s.accessToken}`;
  const getBatch = async (id: string) =>
    (
      await request(app.getHttpServer())
        .get(`/fmis/batches/${id}`)
        .set('Authorization', bearer(admin))
        .expect(200)
    ).body as Record<string, unknown>;
  const untilStatus = (id: string, status: JournalBatchStatus, timeoutMs: number) =>
    waitFor(
      () => getBatch(id),
      (b) => b.status === status,
      timeoutMs,
    );
  const capture = (paidAt: string, amount: string) =>
    request(app.getHttpServer())
      .post('/payments/capture')
      .set('Authorization', bearer(officer))
      .send({
        controlNumber: assessment.controlNumber,
        amount,
        currency: Currency.SOS,
        channel: PaymentChannel.CASH,
        paidAt,
      })
      .expect(201);

  beforeAll(async () => {
    mocks = await NestFactory.create(MocksAppModule, { logger: false });
    mocks.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await mocks.listen(E2E_PORTS.MOCKS);
    app = await createTestApp();
    await app.listen(E2E_PORTS.API);
    admin = await loginAs(app, SEED.ADMIN);
    officer = await loginAs(app, SEED.OFFICER);
    supervisor = await loginAs(app, SEED.SUPERVISOR);
    await request(app.getHttpServer())
      .put(`/config/${SystemConfigKey.FMIS_POST_RETRY_DELAY_SECONDS}`)
      .set('Authorization', bearer(admin))
      .send({ value: SHORT_DELAY_SECONDS })
      .expect(200);
    const payer = await registerPayer(app, officer);
    const licence = await revenueTypeByCode(app, officer, 'BUSINESS_LICENCE');
    assessment = await createAssessment(app, officer, payer.id, licence.id); // 150000 SOS
  });

  afterAll(async () => {
    await app.close();
    await mocks.close();
  });

  it('builds a batch for a day, posts it and stores the FMIS reference; rebuilding adds nothing', async () => {
    const first = await capture(`${day}T09:00:00.000Z`, '1000.00');
    await capture(`${day}T10:00:00.000Z`, '500.00');
    const built = await request(app.getHttpServer())
      .post('/fmis/batches/build')
      .set('Authorization', bearer(supervisor))
      .send({ date: day })
      .expect(201);
    expect(built.body).toMatchObject({
      kind: JournalBatchKind.COLLECTIONS,
      status: JournalBatchStatus.PENDING,
      lineCount: 2,
      totalLocal: '1500',
    });

    const posted = await untilStatus(
      String(built.body.id),
      JournalBatchStatus.POSTED,
      POST_TIMEOUT_MS,
    );
    expect(posted.status).toBe(JournalBatchStatus.POSTED);
    expect(String(posted.fmisReference)).toMatch(/^FMIS-/);
    expect(
      (
        posted.lines as { payment: { controlNumber: string }; debitGl: string; creditGl: string }[]
      )[0],
    ).toMatchObject({
      debitGl: '1010',
      payment: { controlNumber: assessment.controlNumber },
    });

    // Same day again: every payment already has a line, so nothing is eligible and no batch is built.
    const again = await request(app.getHttpServer())
      .post('/fmis/batches/build')
      .set('Authorization', bearer(supervisor))
      .send({ date: day })
      .expect(201);
    expect(again.body).toEqual({});
    // A new payment on a day that already has its batch: the partial unique index refuses a second
    // COLLECTIONS batch, surfaced as DUPLICATE_POSTING; the next build of a later day sweeps it up
    // (catch-up, proven below).
    await capture(`${day}T12:00:00.000Z`, '50.00');
    const duplicate = await request(app.getHttpServer())
      .post('/fmis/batches/build')
      .set('Authorization', bearer(supervisor))
      .send({ date: day })
      .expect(409);
    expect(duplicate.body.code).toBe(ErrorCode.DUPLICATE_POSTING);

    // Traceability from the payment side.
    const detail = await request(app.getHttpServer())
      .get(`/payments/${first.body.id}`)
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(detail.body.journalLine).toMatchObject({
      batchId: built.body.id,
      batchStatus: JournalBatchStatus.POSTED,
      fmisReference: posted.fmisReference,
    });
    const lines = await request(app.getHttpServer())
      .get('/fmis/lines')
      .query({ controlNumber: assessment.controlNumber })
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(lines.body.length).toBeGreaterThanOrEqual(2);
  });

  it('a reversal of a posted payment creates a mirrored REVERSAL batch and the original stays POSTED', async () => {
    const paid = await capture(`${day}T11:00:00.000Z`, '200.00');
    // Not yet journaled (built before this payment) → a second COLLECTIONS batch for the day is refused,
    // so journal it through a reversal check instead: build is per day, hence use a fresh day.
    const otherDay = `${day.slice(0, 'YYYY-MM-'.length)}28`;
    const extra = await capture(`${otherDay}T11:00:00.000Z`, '300.00');
    const batch = await request(app.getHttpServer())
      .post('/fmis/batches/build')
      .set('Authorization', bearer(supervisor))
      .send({ date: otherDay, catchUp: false }) // only the 28th, so the batch has exactly one line
      .expect(201);
    expect(batch.body.lineCount).toBe(1);
    await untilStatus(String(batch.body.id), JournalBatchStatus.POSTED, POST_TIMEOUT_MS);
    expect(paid.body.status).toBe('CONFIRMED');

    const reversal = await request(app.getHttpServer())
      .post('/reversals')
      .set('Authorization', bearer(officer))
      .send({ paymentId: extra.body.id, reason: 'Keyed against the wrong control number' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/reversals/${reversal.body.id}/approve`)
      .set('Authorization', bearer(supervisor))
      .send({ note: 'ok' })
      .expect(201);

    const batches = await request(app.getHttpServer())
      .get('/fmis/batches')
      .query({ kind: JournalBatchKind.REVERSAL, pageSize: 5 })
      .set('Authorization', bearer(admin))
      .expect(200);
    const mirror = (batches.body.items as { id: string }[])[0];
    const mirrorDetail = await untilStatus(
      mirror?.id ?? '',
      JournalBatchStatus.POSTED,
      POST_TIMEOUT_MS,
    );
    expect(
      (mirrorDetail.lines as { debitGl: string; creditGl: string; reversalId: string | null }[])[0],
    ).toMatchObject({
      debitGl: ((await getBatch(String(batch.body.id))) as { lines: { creditGl: string }[] })
        .lines[0]?.creditGl,
      creditGl: '1010',
      reversalId: reversal.body.id,
    });
    const original = await getBatch(String(batch.body.id));
    // Single-line batch: all lines reversed → REVERSED.
    expect(original.status).toBe(JournalBatchStatus.REVERSED);
    expect(original.reversedByBatchId).toBe(mirror?.id);
  });

  it('a later build sweeps payments confirmed after their own day was batched (catch-up)', async () => {
    // The 200.00 and 50.00 payments of `day` were confirmed after that day's batch existed.
    const built = await request(app.getHttpServer())
      .post('/fmis/batches/build')
      .set('Authorization', bearer(supervisor))
      .send({ date: CATCH_UP_DAY })
      .expect(201);
    expect(built.body).toMatchObject({ lineCount: 2, totalLocal: '250' });
    const posted = await untilStatus(
      String(built.body.id),
      JournalBatchStatus.POSTED,
      POST_TIMEOUT_MS,
    );
    expect(
      (posted.lines as { payment: { controlNumber: string } }[]).map(
        (line) => line.payment.controlNumber,
      ),
    ).toEqual([assessment.controlNumber, assessment.controlNumber]);
    // Nothing is left to sweep: a second build for a later day finds no eligible payment.
    const again = await request(app.getHttpServer())
      .post('/fmis/batches/build')
      .set('Authorization', bearer(supervisor))
      .send({ date: `${month}-21` })
      .expect(201);
    expect(again.body).toEqual({});
  });

  it(
    'a batch dated on the 13th fails at the FMIS, is FAILED after the retry limit, and a retry on a clean date succeeds',
    async () => {
      const failing = await capture(`${FAILING_DAY}T09:00:00.000Z`, '10.00');
      expect(failing.body.status).toBe('CONFIRMED');
      const built = await request(app.getHttpServer())
        .post('/fmis/batches/build')
        .set('Authorization', bearer(supervisor))
        .send({ date: FAILING_DAY })
        .expect(201);
      const failed = await untilStatus(
        String(built.body.id),
        JournalBatchStatus.FAILED,
        FAIL_TIMEOUT_MS,
      );
      expect(failed).toMatchObject({ status: JournalBatchStatus.FAILED, attempts: 3 });
      expect(String(failed.lastError).length).toBeGreaterThan(0);

      // The same batch posted twice at the FMIS yields the same reference: prove via a clean day.
      await capture(`${CLEAN_DAY}T09:00:00.000Z`, '10.00');
      const clean = await request(app.getHttpServer())
        .post('/fmis/batches/build')
        .set('Authorization', bearer(supervisor))
        .send({ date: CLEAN_DAY, forceFailure: true })
        .expect(201);
      const cleanFailed = await untilStatus(
        String(clean.body.id),
        JournalBatchStatus.FAILED,
        FAIL_TIMEOUT_MS,
      );
      expect(cleanFailed.status).toBe(JournalBatchStatus.FAILED);
      const retried = await request(app.getHttpServer())
        .post(`/fmis/batches/${clean.body.id}/retry`)
        .set('Authorization', bearer(supervisor))
        .expect(200);
      expect(retried.body.status).toBe(JournalBatchStatus.PENDING);
      const posted = await untilStatus(
        String(clean.body.id),
        JournalBatchStatus.POSTED,
        POST_TIMEOUT_MS,
      );
      expect(String(posted.fmisReference)).toMatch(/^FMIS-/);
    },
    FAIL_TIMEOUT_MS * 2 + POST_TIMEOUT_MS,
  );

  it('reconciles posted totals against the FMIS ledger and drills down to lines', async () => {
    const rows = await request(app.getHttpServer())
      .get('/fmis/reconciliation')
      .query({ from: day, to: day })
      .set('Authorization', bearer(admin))
      .expect(200);
    const revenue = (rows.body as { glCode: string; status: string; ircubTotal: string }[]).find(
      (r) => r.glCode !== '1010',
    );
    expect(revenue).toMatchObject({
      status: FmisReconciliationStatus.MATCHED,
      ircubTotal: '1500.00',
    });
    const drill = await request(app.getHttpServer())
      .get(`/fmis/reconciliation/${day}/${revenue?.glCode ?? ''}`)
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(drill.body.lines).toHaveLength(2);
    const csv = await request(app.getHttpServer())
      .get('/fmis/reconciliation/export.csv')
      .query({ from: day, to: day })
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(csv.text.split('\n')[0]).toBe(
      'date,gl_code,gl_name,ircub_total,fmis_total,difference,status',
    );
  });

  it('manages effective-dated GL mappings', async () => {
    const licence = await revenueTypeByCode(app, officer, 'BUSINESS_LICENCE');
    const created = await request(app.getHttpServer())
      .post('/fmis/gl-mappings')
      .set('Authorization', bearer(admin))
      .send({
        revenueTypeId: licence.id,
        glCode: '410999',
        glName: 'Licence revenue (new)',
        effectiveFrom: '2999-01-01',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/fmis/gl-mappings')
      .set('Authorization', bearer(admin))
      .send({
        revenueTypeId: licence.id,
        glCode: '410998',
        glName: 'dup',
        effectiveFrom: '2999-01-01',
      })
      .expect(409);
    await request(app.getHttpServer())
      .post('/fmis/gl-mappings')
      .set('Authorization', bearer(admin))
      .send({
        revenueTypeId: licence.id,
        glCode: 'ABC',
        glName: 'bad',
        effectiveFrom: '2999-01-02',
      })
      .expect(400);
    await request(app.getHttpServer())
      .delete(`/fmis/gl-mappings/${created.body.id}`)
      .set('Authorization', bearer(admin))
      .expect(204);
  });
});
