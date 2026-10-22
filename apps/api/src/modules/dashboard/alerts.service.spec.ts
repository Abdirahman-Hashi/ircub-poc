import { AlertSeverity, AlertType } from '@ircub/shared';

import { SSE_EVENT } from '../../common/sse/event-names';

import { AlertsService } from './alerts.service';

function build(openExists: boolean) {
  const created: Record<string, unknown>[] = [];
  const emitted: unknown[] = [];
  const prisma = {
    alert: {
      findFirst: jest.fn().mockResolvedValue(openExists ? { id: 'existing' } : null),
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return Promise.resolve({
          id: 'new',
          createdAt: new Date(),
          acknowledgedById: null,
          acknowledgedAt: null,
          ...data,
        });
      }),
    },
  };
  const service = new AlertsService(
    prisma as never,
    { get: jest.fn() } as never,
    {
      emit: jest
        .fn()
        .mockImplementation((type: unknown, data: unknown) => emitted.push({ type, data })),
    } as never,
  );
  return { service, created, emitted, prisma };
}

const input = {
  type: AlertType.COLLECTION_DROP,
  severity: AlertSeverity.WARNING,
  title: 't',
  message: 'm',
  data: { day: '2026-10-22' },
  dedupeKey: '2026-10-22',
};

describe('AlertsService.raise', () => {
  it('creates the alert with its de-duplication key and emits alert.created', async () => {
    const { service, created, emitted, prisma } = build(false);
    const alert = await service.raise(input);
    expect(alert?.type).toBe(AlertType.COLLECTION_DROP);
    expect(created[0]?.data).toEqual({ day: '2026-10-22', dedupeKey: '2026-10-22' });
    expect(prisma.alert.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: AlertType.COLLECTION_DROP, acknowledgedAt: null }),
      }),
    );
    expect(emitted[0]).toMatchObject({
      type: SSE_EVENT.ALERT_CREATED,
      data: { alertId: 'new', type: AlertType.COLLECTION_DROP },
    });
  });

  it('is a no-op while an open alert with the same type and key exists', async () => {
    const { service, created, emitted } = build(true);
    expect(await service.raise(input)).toBeNull();
    expect(created).toHaveLength(0);
    expect(emitted).toHaveLength(0);
  });
});
