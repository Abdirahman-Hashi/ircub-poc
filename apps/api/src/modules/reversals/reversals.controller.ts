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

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { CreateReversalDto } from './dto/create-reversal.dto';
import { DecideReversalDto } from './dto/decide-reversal.dto';
import { ReversalFilterDto } from './dto/reversal-filter.dto';
import { ReversalResponseDto } from './dto/reversal.response.dto';
import { REVERSALS_API } from './reversals.constants';
import { ReversalsService } from './reversals.service';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

@ApiTags('reversals')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(REVERSALS_API.PATH)
export class ReversalsController {
  constructor(private readonly reversals: ReversalsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PAYMENTS_VIEW)
  @ApiOperation({ summary: 'Reversal queue with filters' })
  @ApiResponse({ status: HttpStatus.OK, type: [ReversalResponseDto] })
  list(@Query() filter: ReversalFilterDto): Promise<Paginated<ReversalResponseDto>> {
    return this.reversals.list(filter);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PAYMENTS_VIEW)
  @ApiOperation({ summary: 'One reversal' })
  @ApiResponse({ status: HttpStatus.OK, type: ReversalResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ReversalResponseDto> {
    return this.reversals.get(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.REVERSALS_CAPTURE)
  @ApiOperation({ summary: 'Request a reversal of a confirmed payment' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ReversalResponseDto })
  create(
    @Body() dto: CreateReversalDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ReversalResponseDto> {
    return this.reversals.create(dto, actor.id);
  }

  @Post(`:id/${REVERSALS_API.APPROVE}`)
  @RequirePermission(PERMISSIONS.REVERSALS_APPROVE)
  @ApiOperation({
    summary: 'Approve: payment → REVERSED, assessment ledger reduced (SoD: not the capturer)',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: ReversalResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'SOD_VIOLATION' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideReversalDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ReversalResponseDto> {
    return this.reversals.approve(id, dto, actor.id);
  }

  @Post(`:id/${REVERSALS_API.REJECT}`)
  @RequirePermission(PERMISSIONS.REVERSALS_APPROVE)
  @ApiOperation({ summary: 'Reject a reversal request (SoD: not the capturer)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ReversalResponseDto })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideReversalDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ReversalResponseDto> {
    return this.reversals.reject(id, dto, actor.id);
  }
}
