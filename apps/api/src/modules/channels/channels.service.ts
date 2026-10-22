import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ErrorCode, type PaymentChannel } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';

import { CHANNEL_CLIENTS } from './channels.constants';
import { CHANNELS_MESSAGES } from './channels.messages';

import type { ChannelClient, ChannelClientMap } from './channels.types';

/** Registry keyed by PaymentChannel (D15); only online channels are registered. */
@Injectable()
export class ChannelsService {
  constructor(@Inject(CHANNEL_CLIENTS) private readonly clients: ChannelClientMap) {}

  clientFor(channel: PaymentChannel): ChannelClient {
    const client = this.clients.get(channel);
    if (client === undefined) {
      throw new AppException(
        ErrorCode.CHANNEL_NOT_SUPPORTED,
        CHANNELS_MESSAGES.NOT_SUPPORTED,
        HttpStatus.BAD_REQUEST,
        { channel },
      );
    }
    return client;
  }

  onlineChannels(): PaymentChannel[] {
    return [...this.clients.keys()];
  }
}
