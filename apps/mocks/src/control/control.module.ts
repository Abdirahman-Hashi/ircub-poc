import { Module } from '@nestjs/common';

import { ChannelsModule } from '../channels/channels.module';

import { ControlController } from './control.controller';

@Module({
  imports: [ChannelsModule],
  controllers: [ControlController],
})
export class ControlModule {}
