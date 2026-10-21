import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { HEALTH_STATUS, type HealthResponse } from '@ircub/shared';

import { Public } from '../../common/auth/public.decorator';

import { HEALTH } from './health.constants';
import { HealthService } from './health.service';

import type { Response } from 'express';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get(HEALTH.LIVENESS_PATH)
  @ApiOperation({ summary: 'Liveness probe — process is up' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Always ok while the process runs' })
  liveness(): HealthResponse {
    return this.health.liveness();
  }

  @Public()
  @Get(HEALTH.READINESS_PATH)
  @ApiOperation({ summary: 'Readiness probe — database and job queue reachable' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All checks up' })
  @ApiResponse({ status: HttpStatus.SERVICE_UNAVAILABLE, description: 'At least one check down' })
  async readiness(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const result = await this.health.readiness();
    if (result.status !== HEALTH_STATUS.OK) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
