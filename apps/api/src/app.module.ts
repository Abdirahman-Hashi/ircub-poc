import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { THROTTLE } from './app.constants';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { PermissionsGuard } from './common/auth/permissions.guard';
import { CsvModule } from './common/csv/csv.module';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { IdsModule } from './common/ids/ids.module';
import { JobsModule } from './common/jobs/jobs.module';
import { LoggingModule } from './common/logging/logging.module';
import { SseModule } from './common/sse/sse.module';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BulkUploadsModule } from './modules/bulk-uploads/bulk-uploads.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FmisModule } from './modules/fmis/fmis.module';
import { FxModule } from './modules/fx/fx.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PayersModule } from './modules/payers/payers.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { RevenueTypesModule } from './modules/revenue-types/revenue-types.module';
import { ReversalsModule } from './modules/reversals/reversals.module';
import { RolesModule } from './modules/roles/roles.module';
import { SelfModule } from './modules/self/self.module';
import { SodModule } from './modules/sod/sod.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { UsersModule } from './modules/users/users.module';
import { WaterModule } from './modules/water/water.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            name: THROTTLE.DEFAULT.name,
            ttl: THROTTLE.DEFAULT.ttlMs,
            limit: THROTTLE.DEFAULT.limit,
          },
        ],
        // The e2e suite logs in dozens of times per minute; rate limits are a production control.
        skipIf: () => config.isTest,
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SystemConfigModule,
    JobsModule,
    SseModule,
    HealthModule,
    PermissionsModule,
    AuthModule,
    SodModule,
    RolesModule,
    UsersModule,
    AuditModule,
    IdsModule,
    CsvModule,
    FxModule,
    ChannelsModule,
    PayersModule,
    RevenueTypesModule,
    AssessmentsModule,
    PaymentsModule,
    ReconciliationModule,
    FmisModule,
    DashboardModule,
    BulkUploadsModule,
    ReversalsModule,
    SelfModule,
    NotificationsModule,
    WaterModule,
  ],
  providers: [
    // Order matters: throttle first, then authenticate, then authorise.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
