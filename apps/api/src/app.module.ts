import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { THROTTLE } from './app.constants';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { JobsModule } from './common/jobs/jobs.module';
import { LoggingModule } from './common/logging/logging.module';
import { SseModule } from './common/sse/sse.module';
import { AppConfigModule } from './config/app-config.module';
import { HealthModule } from './modules/health/health.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    ThrottlerModule.forRoot({
      throttlers: [
        { name: THROTTLE.DEFAULT.name, ttl: THROTTLE.DEFAULT.ttlMs, limit: THROTTLE.DEFAULT.limit },
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SystemConfigModule,
    JobsModule,
    SseModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
