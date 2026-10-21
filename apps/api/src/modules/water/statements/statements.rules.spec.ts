import { buildStatement } from './statements.rules';

describe('buildStatement', () => {
  const bills = [
    {
      billNumber: 'B1',
      period: '2026-07',
      releasedAt: new Date('2026-08-01T00:00:00Z'),
      totalDue: '1000',
    },
    {
      billNumber: 'B2',
      period: '2026-08',
      releasedAt: new Date('2026-09-01T00:00:00Z'),
      totalDue: '1200',
    },
    {
      billNumber: 'B3',
      period: '2026-09',
      releasedAt: new Date('2026-10-01T00:00:00Z'),
      totalDue: '900',
    },
  ];
  const payments = [
    { id: 'p1', reference: 'CASH', paidAt: new Date('2026-08-10T00:00:00Z'), localAmount: '1000' },
    { id: 'p2', reference: 'BNK-1', paidAt: new Date('2026-09-15T00:00:00Z'), localAmount: '500' },
  ];

  it('computes the opening balance from events before the window and a running balance inside it', () => {
    const statement = buildStatement(
      bills,
      payments,
      new Date('2026-09-01T00:00:00Z'),
      new Date('2026-10-31T00:00:00Z'),
    );
    expect(statement.openingBalance.toFixed()).toBe('0'); // 1000 billed − 1000 paid before September
    expect(statement.lines.map((l) => `${l.kind}:${l.balance.toFixed()}`)).toEqual([
      'OPENING:0',
      'BILL:1200',
      'PAYMENT:700',
      'BILL:1600',
    ]);
    expect(statement.closingBalance.toFixed()).toBe('1600');
  });

  it('excludes events after the window and orders bills before payments on the same day', () => {
    const sameDay = [
      { id: 'p3', reference: 'X', paidAt: new Date('2026-09-01T00:00:00Z'), localAmount: '200' },
    ];
    const statement = buildStatement(
      bills,
      sameDay,
      new Date('2026-09-01T00:00:00Z'),
      new Date('2026-09-30T00:00:00Z'),
    );
    expect(statement.lines.map((l) => l.kind)).toEqual(['OPENING', 'BILL', 'PAYMENT']);
    expect(statement.closingBalance.toFixed()).toBe('2000'); // 1000 opening + 1200 − 200
  });
});
