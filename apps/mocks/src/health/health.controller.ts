import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { HEALTH_STATUS } from '@ircub/shared';

import { MOCKS_APP, PATHS } from '../mocks.constants';
import { StoreService } from '../store/store.service';

import type { MocksHealthResponse } from './health.types';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly store: StoreService) {}

  @Get(PATHS.HEALTH)
  @ApiOperation({ summary: 'Liveness probe with store counters' })
  health(): MocksHealthResponse {
    return {
      status: HEALTH_STATUS.OK,
      checks: {},
      version: MOCKS_APP.VERSION,
      timestamp: new Date().toISOString(),
      store: this.store.snapshot(),
    };
  }
}
