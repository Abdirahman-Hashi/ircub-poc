import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { ChannelsModule } from './channels/channels.module';
import { MocksConfigModule } from './config/mocks-config.module';
import { MocksConfigService } from './config/mocks-config.service';
import { ControlModule } from './control/control.module';
import { FmisModule } from './fmis/fmis.module';
import { HealthModule } from './health/health.module';
import { MOCKS_APP } from './mocks.constants';
import { NotificationsModule } from './notifications/notifications.module';
import { RatesModule } from './rates/rates.module';
import { StoreModule } from './store/store.module';

@Module({
  imports: [
    MocksConfigModule,
    LoggerModule.forRootAsync({
      inject: [MocksConfigService],
      useFactory: (config: MocksConfigService) => ({
        pinoHttp: {
          level: config.logLevel,
          ...(config.isProduction
            ? {}
            : {
                transport: { target: MOCKS_APP.PRETTY_LOG_TARGET, options: { singleLine: true } },
              }),
        },
      }),
    }),
    StoreModule,
    HealthModule,
    ControlModule,
    RatesModule,
    NotificationsModule,
    ChannelsModule,
    FmisModule,
  ],
})
export class AppModule {}
