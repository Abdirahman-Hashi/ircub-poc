import { Controller, type MessageEvent, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { filter, from, interval, map, merge, type Observable, switchMap } from 'rxjs';

import { PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { PermissionsService } from '../../modules/permissions/permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../auth/current-user.decorator';

import { EventBus } from './event-bus';
import { SSE_EVENT } from './event-names';
import { SSE } from './sse.constants';
import { isVisibleTo } from './sse.rules';

import type { AppEvent, SseScope } from './sse.types';
import type { AuthenticatedUser } from '../auth/auth.types';

function toMessageEvent(event: AppEvent): MessageEvent {
  return { type: event.type, data: event };
}

/**
 * Authenticated event stream. Staff holding `payments.view` receive every event; customers
 * receive only events about their own payer (`sse.rules.ts`). EventSource cannot send headers,
 * so the web passes the short-lived access token as `?access_token=` (accepted by JwtStrategy).
 */
@ApiTags('events')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(SSE.PATH)
export class SseController {
  constructor(
    private readonly eventBus: EventBus,
    private readonly permissions: PermissionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Sse()
  @ApiOperation({
    summary: 'Server-Sent Events: payment updates, alerts, batches (scoped to the caller)',
  })
  @ApiProduces('text/event-stream')
  events(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    const heartbeat = interval(SSE.HEARTBEAT_INTERVAL_MS).pipe(
      map((): AppEvent => ({
        type: SSE_EVENT.HEARTBEAT,
        data: { at: new Date().toISOString() },
        emittedAt: new Date().toISOString(),
      })),
    );
    return from(this.scopeFor(user)).pipe(
      switchMap((scope) =>
        merge(this.eventBus.stream().pipe(filter((event) => isVisibleTo(event, scope))), heartbeat),
      ),
      map(toMessageEvent),
    );
  }

  private async scopeFor(user: AuthenticatedUser): Promise<SseScope> {
    const held = await this.permissions.getEffectivePermissions(user.id);
    if (held.has(PERMISSIONS.PAYMENTS_VIEW)) {
      return { all: true, payerId: null };
    }
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { payerId: true },
    });
    return { all: false, payerId: row?.payerId ?? null };
  }
}
