import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CHANNEL, PaymentChannel } from '@ircub/shared';

import { PATHS } from '../mocks.constants';

import { ChannelControllerBase } from './channel.controller-base';
import { ChannelsService } from './channels.service';

@ApiTags('bank')
@Controller(PATHS.BANK)
export class BankController extends ChannelControllerBase {
  constructor(channels: ChannelsService) {
    super(channels, { channel: PaymentChannel.BANK, refPrefix: CHANNEL.BANK_REF_PREFIX });
  }
}
