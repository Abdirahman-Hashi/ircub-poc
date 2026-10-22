import { AlertSeverity, AlertType, PaymentStatus } from '@ircub/shared';

import { SSE_EVENT } from './event-names';
import { isVisibleTo } from './sse.rules';

import type { AppEvent } from './sse.types';

const paymentEvent = (payerId: string): AppEvent => ({
  type: SSE_EVENT.PAYMENT_UPDATED,
  data: {
    paymentId: 'p1',
    payerId,
    status: PaymentStatus.CONFIRMED,
    controlNumber: '1',
    localAmount: '1',
    failureReason: null,
  },
  emittedAt: '',
});

describe('isVisibleTo', () => {
  it('staff scope sees everything', () => {
    expect(isVisibleTo(paymentEvent('x'), { all: true, payerId: null })).toBe(true);
  });

  it('customer scope sees only own payment events and heartbeats', () => {
    const scope = { all: false, payerId: 'me' };
    expect(isVisibleTo(paymentEvent('me'), scope)).toBe(true);
    expect(isVisibleTo(paymentEvent('other'), scope)).toBe(false);
    expect(isVisibleTo({ type: SSE_EVENT.HEARTBEAT, data: { at: '' }, emittedAt: '' }, scope)).toBe(
      true,
    );
    const alert: AppEvent = {
      type: SSE_EVENT.ALERT_CREATED,
      data: {
        alertId: 'a',
        type: AlertType.COLLECTION_DROP,
        severity: AlertSeverity.INFO,
        title: '',
      },
      emittedAt: '',
    };
    expect(isVisibleTo(alert, scope)).toBe(false);
    expect(isVisibleTo(paymentEvent('me'), { all: false, payerId: null })).toBe(false);
  });
});
