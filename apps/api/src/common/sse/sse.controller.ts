import { Controller, type MessageEvent, Sse } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { interval, map, merge, type Observable } from 'rxjs';

import { Public } from '../auth/public.decorator';

import { EventBus } from './event-bus';
import { SSE_EVENT } from './event-names';
import { SSE } from './sse.constants';

import type { AppEvent } from './sse.types';

function toMessageEvent(event: AppEvent): MessageEvent {
  return { type: event.type, data: event };
}

@ApiTags('events')
@Controller(SSE.PATH)
export class SseController {
  constructor(private readonly eventBus: EventBus) {}

  // Public until phase 1 adds JWT auth; then the guard applies and `@Public()` is removed.
  @Public()
  @Sse()
  @ApiOperation({ summary: 'Server-Sent Events stream (payment updates, alerts, batches)' })
  @ApiProduces('text/event-stream')
  events(): Observable<MessageEvent> {
    const heartbeat = interval(SSE.HEARTBEAT_INTERVAL_MS).pipe(
      map((): AppEvent => ({
        type: SSE_EVENT.HEARTBEAT,
        data: { at: new Date().toISOString() },
        emittedAt: new Date().toISOString(),
      })),
    );
    return merge(this.eventBus.stream(), heartbeat).pipe(map(toMessageEvent));
  }
}
