import { Module } from '@nestjs/common';

import { BankController } from './bank.controller';
import { ChannelsService } from './channels.service';
import { MomoController } from './momo.controller';

@Module({
  controllers: [BankController, MomoController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
