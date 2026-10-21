import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type Paginated, PayerStatus, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { CreatePayerDto } from './dto/create-payer.dto';
import { DuplicateFilterDto } from './dto/duplicate-filter.dto';
import { DuplicateFlagResponseDto } from './dto/duplicate-flag.response.dto';
import { PayerFilterDto } from './dto/payer-filter.dto';
import { PayerProfileResponseDto } from './dto/payer-profile.response.dto';
import { PayerResponseDto } from './dto/payer.response.dto';
import { RegisteredPayerResponseDto } from './dto/registered-payer.response.dto';
import { ReviewDuplicateDto } from './dto/review-duplicate.dto';
import { UpdatePayerDto } from './dto/update-payer.dto';
import { PAYERS_API } from './payers.constants';
import { PayersService } from './payers.service';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

@ApiTags('payers')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(PAYERS_API.PATH)
export class PayersController {
  constructor(private readonly payers: PayersService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PAYERS_VIEW)
  @ApiOperation({ summary: 'Search payers by name, TIN or phone' })
  @ApiResponse({ status: HttpStatus.OK, type: [PayerResponseDto] })
  list(@Query() filter: PayerFilterDto): Promise<Paginated<PayerResponseDto>> {
    return this.payers.list(filter);
  }

  @Get(PAYERS_API.DUPLICATES)
  @RequirePermission(PERMISSIONS.PAYERS_REVIEW_DUPLICATES)
  @ApiOperation({ summary: 'Duplicate review queue' })
  @ApiResponse({ status: HttpStatus.OK, type: [DuplicateFlagResponseDto] })
  duplicates(@Query() filter: DuplicateFilterDto): Promise<Paginated<DuplicateFlagResponseDto>> {
    return this.payers.listDuplicates(filter);
  }

  @Post(`${PAYERS_API.DUPLICATES}/:id/${PAYERS_API.REVIEW}`)
  @RequirePermission(PERMISSIONS.PAYERS_REVIEW_DUPLICATES)
  @ApiOperation({ summary: 'Confirm or dismiss a duplicate flag' })
  @ApiResponse({ status: HttpStatus.CREATED, type: DuplicateFlagResponseDto })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDuplicateDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<DuplicateFlagResponseDto> {
    return this.payers.reviewDuplicate(id, dto, actor.id);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PAYERS_VIEW)
  @ApiOperation({ summary: '360° profile: payer, assessments, payments, balances' })
  @ApiResponse({ status: HttpStatus.OK, type: PayerProfileResponseDto })
  profile(@Param('id', ParseUUIDPipe) id: string): Promise<PayerProfileResponseDto> {
    return this.payers.profile(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PAYERS_REGISTER)
  @ApiOperation({ summary: 'Register a payer; generates the TIN and returns duplicate warnings' })
  @ApiResponse({ status: HttpStatus.CREATED, type: RegisteredPayerResponseDto })
  create(
    @Body() dto: CreatePayerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<RegisteredPayerResponseDto> {
    return this.payers.create(dto, actor.id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.PAYERS_REGISTER)
  @ApiOperation({ summary: 'Edit a payer; re-runs duplicate detection' })
  @ApiResponse({ status: HttpStatus.OK, type: RegisteredPayerResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayerDto,
  ): Promise<RegisteredPayerResponseDto> {
    return this.payers.update(id, dto);
  }

  @Post(`:id/${PAYERS_API.SUSPEND}`)
  @RequirePermission(PERMISSIONS.PAYERS_REGISTER)
  @ApiOperation({ summary: 'Suspend: no new assessments or captures' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PayerResponseDto })
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<PayerResponseDto> {
    return this.payers.setStatus(id, PayerStatus.SUSPENDED);
  }

  @Post(`:id/${PAYERS_API.REACTIVATE}`)
  @RequirePermission(PERMISSIONS.PAYERS_REGISTER)
  @ApiOperation({ summary: 'Reactivate a suspended payer' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PayerResponseDto })
  reactivate(@Param('id', ParseUUIDPipe) id: string): Promise<PayerResponseDto> {
    return this.payers.setStatus(id, PayerStatus.ACTIVE);
  }
}
