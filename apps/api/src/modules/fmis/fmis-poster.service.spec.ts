import { JournalBatchStatus } from '@ircub/shared';

import { SSE_EVENT } from '../../common/sse/event-names';

import { FmisPosterService } from './fmis-poster.service';

const LIMIT = 3;

function build(options: { status: JournalBatchStatus; attempts: number; reply: 'ok' | Error }) {
  const updates: { data: Record<string, unknown> }[] = [];
  const emitted: unknown[] = [];
  const prisma = {
    journalBatch: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'b1',
        batchDate: new Date('2026-10-21T00:00:00Z'),
        status: options.status,
        attempts: options.attempts,
        lines: [
          { debitGl: '1010', creditGl: '4100', amount: '100.00', currency: 'SOS', reference: 'r' },
        ],
      }),
      update: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
        updates.push(args);
        return Promise.resolve({ id: 'b1', status: args.data.status ?? options.status });
      }),
    },
  };
  const fmis = {
    postJournal: jest
      .fn()
      .mockImplementation(() =>
        options.reply instanceof Error
          ? Promise.reject(options.reply)
          : Promise.resolve({ fmisReference: 'FMIS-1', status: 'POSTED' }),
      ),
    ledger: jest.fn(),
  };
  const service = new FmisPosterService(
    prisma as never,
    fmis,
    { get: jest.fn().mockResolvedValue(LIMIT) } as never,
    { register: jest.fn() } as never,
    {
      emit: jest
        .fn()
        .mockImplementation((type: unknown, data: unknown) => emitted.push({ type, data })),
    } as never,
    { raise: jest.fn().mockResolvedValue(null) } as never,
  );
  return { service, updates, emitted, fmis };
}

describe('FmisPosterService', () => {
  it('posts a pending batch, stores the reference and emits the event', async () => {
    const { service, updates, emitted, fmis } = build({
      status: JournalBatchStatus.PENDING,
      attempts: 0,
      reply: 'ok',
    });
    await service.post('b1');
    expect(fmis.postJournal).toHaveBeenCalledWith(
      expect.objectContaining({ batchId: 'b1', date: '2026-10-21' }),
      false,
    );
    expect(updates[0]?.data).toMatchObject({
      status: JournalBatchStatus.POSTED,
      fmisReference: 'FMIS-1',
      attempts: 1,
      lastError: null,
    });
    expect(emitted[0]).toMatchObject({
      type: SSE_EVENT.FMIS_BATCH_UPDATED,
      data: { batchId: 'b1', status: JournalBatchStatus.POSTED },
    });
  });

  it('is a no-op for a POSTED batch (idempotent)', async () => {
    const { service, updates, fmis } = build({
      status: JournalBatchStatus.POSTED,
      attempts: 1,
      reply: 'ok',
    });
    await service.post('b1');
    expect(fmis.postJournal).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it('records the error and throws for a retry while attempts remain', async () => {
    const { service, updates } = build({
      status: JournalBatchStatus.PENDING,
      attempts: 0,
      reply: new Error('FMIS down'),
    });
    await expect(service.post('b1')).rejects.toThrow('FMIS down');
    expect(updates[0]?.data).toEqual({ attempts: 1, lastError: 'FMIS down' });
  });

  it('marks FAILED with lastError once the limit is reached and stops retrying', async () => {
    const { service, updates, emitted } = build({
      status: JournalBatchStatus.PENDING,
      attempts: LIMIT - 1,
      reply: new Error('FMIS down'),
    });
    await expect(service.post('b1')).resolves.toBeUndefined();
    expect(updates[0]?.data).toEqual({
      attempts: LIMIT,
      lastError: 'FMIS down',
      status: JournalBatchStatus.FAILED,
    });
    expect(emitted[0]).toMatchObject({ data: { status: JournalBatchStatus.FAILED } });
  });
});
