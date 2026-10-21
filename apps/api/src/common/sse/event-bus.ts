import { Injectable, Logger } from '@nestjs/common';
import { type Observable, Subject } from 'rxjs';

import type { AppEventPayloads } from './event-payloads';
import type { AppEvent, SseEventName } from './sse.types';

/**
 * In-process publish/subscribe for real-time UI updates (D4). Services call `emit`;
 * the SSE controller subscribes. Single-process by design — the POC runs one API instance.
 */
@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private readonly subject = new Subject<AppEvent>();

  emit<K extends SseEventName>(type: K, data: AppEventPayloads[K]): void {
    const event = { type, data, emittedAt: new Date().toISOString() } as AppEvent;
    this.logger.debug({ msg: 'event emitted', type });
    this.subject.next(event);
  }

  stream(): Observable<AppEvent> {
    return this.subject.asObservable();
  }
}
