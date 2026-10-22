import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CHANNEL, PaymentChannel } from '@ircub/shared';

import { PATHS } from '../mocks.constants';

import { ChannelControllerBase } from './channel.controller-base';
import { ChannelsService } from './channels.service';

@ApiTags('mobile-money')
@Controller(PATHS.MOMO)
export class MomoController extends ChannelControllerBase {
  constructor(channels: ChannelsService) {
    super(channels, { channel: PaymentChannel.MOBILE_MONEY, refPrefix: CHANNEL.MOMO_REF_PREFIX });
  }
}
