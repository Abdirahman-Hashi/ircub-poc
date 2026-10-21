import { Global, Module } from '@nestjs/common';

import { EventBus } from './event-bus';
import { SseController } from './sse.controller';

@Global()
@Module({
  controllers: [SseController],
  providers: [EventBus],
  exports: [EventBus],
})
export class SseModule {}
