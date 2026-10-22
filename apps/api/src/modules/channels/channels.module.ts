import { Global, Module } from '@nestjs/common';

import { CHANNEL, PaymentChannel } from '@ircub/shared';

import { AppConfigService } from '../../config/app-config.service';

import { CHANNEL_CLIENTS } from './channels.constants';
import { ChannelsService } from './channels.service';
import { HttpChannelClient } from './http-channel.client';

import type { ChannelClient, ChannelClientMap } from './channels.types';

@Global()
@Module({
  providers: [
    {
      provide: CHANNEL_CLIENTS,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): ChannelClientMap =>
        new Map<PaymentChannel, ChannelClient>([
          [
            PaymentChannel.BANK,
            new HttpChannelClient(PaymentChannel.BANK, config.mocksBaseUrl, CHANNEL.BANK_PATH),
          ],
          [
            PaymentChannel.MOBILE_MONEY,
            new HttpChannelClient(
              PaymentChannel.MOBILE_MONEY,
              config.mocksBaseUrl,
              CHANNEL.MOMO_PATH,
            ),
          ],
        ]),
    },
    ChannelsService,
  ],
  exports: [ChannelsService],
})
export class ChannelsModule {}
