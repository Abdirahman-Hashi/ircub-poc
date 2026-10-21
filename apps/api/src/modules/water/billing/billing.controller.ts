import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type Paginated, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../../app.constants';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermission } from '../../../common/auth/require-permission.decorator';

import { BILLING_API } from './billing.constants';
import { BillingService } from './billing.service';
import { BillingCycleFilterDto } from './dto/billing-cycle-filter.dto';
import { BillingCycleResponseDto } from './dto/billing-cycle.response.dto';
import { RunCycleDto } from './dto/run-cycle.dto';

import type { AuthenticatedUser } from '../../../common/auth/auth.types';

@ApiTags('water')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(BILLING_API.PATH)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiOperation({ summary: 'Billing cycles with their exception-report stats' })
  @ApiResponse({ status: HttpStatus.OK, type: [BillingCycleResponseDto] })
  list(@Query() filter: BillingCycleFilterDto): Promise<Paginated<BillingCycleResponseDto>> {
    return this.billing.list(filter);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiOperation({
    summary: 'Cycle with stats: accounts, billed, flagged, skipped (reasons), total',
  })
  @ApiResponse({ status: HttpStatus.OK, type: BillingCycleResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<BillingCycleResponseDto> {
    return this.billing.get(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.BILLING_RUN)
  @ApiOperation({ summary: 'Run (or re-run a DRAFT/REVIEW) monthly cycle; result is REVIEW' })
  @ApiResponse({ status: HttpStatus.CREATED, type: BillingCycleResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'BILLING_CYCLE_INVALID_STATE (already released)',
  })
  run(
    @Body() dto: RunCycleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<BillingCycleResponseDto> {
    return this.billing.run(dto.period, actor.id);
  }

  @Post(`:id/${BILLING_API.RELEASE}`)
  @RequirePermission(PERMISSIONS.BILLING_RELEASE)
  @ApiOperation({
    summary: 'Release: bills → RELEASED, PDFs rendered and notifications sent by jobs',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: BillingCycleResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'BILLING_CYCLE_HAS_FLAGGED_BILLS' })
  release(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<BillingCycleResponseDto> {
    return this.billing.release(id, actor.id);
  }
}
