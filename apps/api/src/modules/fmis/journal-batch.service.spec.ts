import { ErrorCode, JournalBatchKind, JournalBatchStatus } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';

import { PRISMA_UNIQUE_VIOLATION } from './fmis.rules';
import { JournalBatchService } from './journal-batch.service';

const RETRY_LIMIT = 3;

interface Fakes {
  readonly created: Record<string, unknown>[];
  readonly lineUpdates: Record<string, unknown>[];
  readonly batchUpdates: { where: { id: string }; data: Record<string, unknown> }[];
  readonly deleted: string[];
  readonly enqueued: unknown[];
}

function build(options: {
  originalLine: Record<string, unknown> | null;
  siblingsReversed?: boolean[];
  createManyError?: Error;
}) {
  const fakes: Fakes = {
    created: [],
    lineUpdates: [],
    batchUpdates: [],
    deleted: [],
    enqueued: [],
  };
  const tx = {
    journalBatch: {
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        fakes.created.push(data);
        return Promise.resolve({
          id: 'new-batch',
          status: JournalBatchStatus.PENDING,
          attempts: 0,
          ...data,
          totalLocal: { toFixed: () => String(data.totalLocal) },
        });
      }),
      update: jest
        .fn()
        .mockImplementation((args: { where: { id: string }; data: Record<string, unknown> }) => {
          fakes.batchUpdates.push(args);
          return Promise.resolve({
            id: args.where.id,
            totalLocal: { toFixed: () => '0' },
            ...args.data,
          });
        }),
    },
    journalLine: {
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        fakes.created.push(data);
        return Promise.resolve({});
      }),
      createMany: jest
        .fn()
        .mockImplementation(() =>
          options.createManyError === undefined
            ? Promise.resolve({})
            : Promise.reject(options.createManyError),
        ),
      update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        fakes.lineUpdates.push(data);
        return Promise.resolve({});
      }),
      findMany: jest
        .fn()
        .mockResolvedValue(
          (options.siblingsReversed ?? [true]).map((reversed) => ({ reversed, amount: '1' })),
        ),
      delete: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
        fakes.deleted.push(where.id);
        return Promise.resolve({});
      }),
      findUnique: jest.fn().mockResolvedValue(options.originalLine),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'p1',
          controlNumber: '000000000195',
          localAmount: '100',
          currency: 'SOS',
          assessment: { revenueTypeId: 'rt' },
          billId: null,
        },
      ]),
    },
    revenueType: { findUnique: jest.fn() },
  };
  const prisma = { ...tx, $transaction: (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) };
  const service = new JournalBatchService(
    prisma as never,
    { resolve: jest.fn().mockResolvedValue({ glCode: '4100' }) } as never,
    {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          Promise.resolve(key === 'CASH_GL_CODE' ? '1010' : RETRY_LIMIT),
        ),
    } as never,
    {
      enqueue: jest.fn().mockImplementation((...args: unknown[]) => {
        fakes.enqueued.push(args);
        return Promise.resolve('job');
      }),
    } as never,
    { emit: jest.fn() } as never,
  );
  return { service, fakes };
}

const postedLine = {
  id: 'line-1',
  batchId: 'batch-1',
  revenueTypeId: 'rt',
  glCode: '4100',
  debitGl: '1010',
  creditGl: '4100',
  amount: { toFixed: () => '100.00' },
  currency: 'SOS',
  reference: '000000000195',
  batch: { status: JournalBatchStatus.POSTED },
};

describe('JournalBatchService', () => {
  it('maps a unique violation while building to DUPLICATE_POSTING', async () => {
    const { service } = build({
      originalLine: null,
      createManyError: Object.assign(new Error('unique'), { code: PRISMA_UNIQUE_VIOLATION }),
    });
    await expect(service.buildForDate('2026-10-21')).rejects.toMatchObject({
      code: ErrorCode.DUPLICATE_POSTING,
    });
  });

  it('builds a PENDING batch with one line per eligible payment and enqueues posting', async () => {
    const { service, fakes } = build({ originalLine: null });
    const batch = await service.buildForDate('2026-10-21');
    expect(batch?.status).toBe(JournalBatchStatus.PENDING);
    expect(fakes.created[0]).toMatchObject({
      kind: JournalBatchKind.COLLECTIONS,
      lineCount: 1,
      totalLocal: '100.00',
    });
    expect(fakes.enqueued).toHaveLength(1);
  });

  it('mirrors an approved reversal of a posted line and keeps the original POSTED while lines remain', async () => {
    const { service, fakes } = build({ originalLine: postedLine, siblingsReversed: [true, false] });
    const batch = await service.onReversalApproved('rev-1', 'p1');
    expect(batch?.kind).toBe(JournalBatchKind.REVERSAL);
    expect(fakes.created[1]).toMatchObject({
      reversalId: 'rev-1',
      paymentId: null,
      debitGl: '4100',
      creditGl: '1010',
      amount: '100.00',
    });
    expect(fakes.lineUpdates[0]).toEqual({ reversed: true });
    expect(fakes.batchUpdates[0]).toMatchObject({ where: { id: 'batch-1' }, data: {} });
  });

  it('marks the original batch REVERSED once every line is reversed', async () => {
    const { service, fakes } = build({ originalLine: postedLine, siblingsReversed: [true] });
    await service.onReversalApproved('rev-1', 'p1');
    expect(fakes.batchUpdates[0]?.data).toMatchObject({
      status: JournalBatchStatus.REVERSED,
      reversedByBatchId: 'new-batch',
    });
  });

  it('drops a line that was never posted instead of reversing it, and ignores unposted payments', async () => {
    const pending = { ...postedLine, batch: { status: JournalBatchStatus.PENDING } };
    const { service, fakes } = build({ originalLine: pending });
    expect(await service.onReversalApproved('rev-1', 'p1')).toBeNull();
    expect(fakes.deleted).toEqual(['line-1']);
    const { service: none } = build({ originalLine: null });
    expect(await none.onReversalApproved('rev-2', 'p9')).toBeNull();
  });

  it('refuses to retry a batch that is not FAILED', async () => {
    const { service } = build({ originalLine: null });
    (
      service as unknown as { prisma: { journalBatch: { findUnique: jest.Mock } } }
    ).prisma.journalBatch.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'b', status: JournalBatchStatus.POSTED });
    await expect(service.retry('b')).rejects.toBeInstanceOf(AppException);
  });
});
