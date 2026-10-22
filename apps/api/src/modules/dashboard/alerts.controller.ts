import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type Paginated, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { AlertsService } from './alerts.service';
import { DASHBOARD_API } from './dashboard.constants';
import { AlertFilterDto } from './dto/alert-filter.dto';
import { AlertResponseDto } from './dto/alert.response.dto';
import { UnacknowledgedCountResponseDto } from './dto/unacknowledged-count.response.dto';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

@ApiTags('alerts')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(DASHBOARD_API.ALERTS_PATH)
@RequirePermission(PERMISSIONS.ALERTS_VIEW)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Alerts, newest first; `acknowledged=false` for the open ones' })
  @ApiResponse({ status: HttpStatus.OK, type: [AlertResponseDto] })
  list(@Query() filter: AlertFilterDto): Promise<Paginated<AlertResponseDto>> {
    return this.alerts.list(filter);
  }

  @Get('unacknowledged-count')
  @ApiOperation({ summary: 'Open alert count for the header bell' })
  @ApiResponse({ status: HttpStatus.OK, type: UnacknowledgedCountResponseDto })
  async unacknowledged(): Promise<UnacknowledgedCountResponseDto> {
    return { count: await this.alerts.unacknowledgedCount() };
  }

  @Post(DASHBOARD_API.EVALUATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run the anomaly checks now; returns the alerts raised' })
  @ApiResponse({ status: HttpStatus.OK, type: [AlertResponseDto] })
  evaluate(): Promise<AlertResponseDto[]> {
    return this.alerts.evaluate(new Date());
  }

  @Post(`:id/${DASHBOARD_API.ACK}`)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiResponse({ status: HttpStatus.OK, type: AlertResponseDto })
  acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AlertResponseDto> {
    return this.alerts.acknowledge(id, actor.id);
  }
}
