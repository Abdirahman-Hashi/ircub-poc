import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ErrorCode, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermission } from '../../common/auth/require-permission.decorator';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { PayerProfileResponseDto } from '../payers/dto/payer-profile.response.dto';
import { PayersService } from '../payers/payers.service';

import { SELF_API } from './self.constants';
import { SELF_MESSAGES } from './self.messages';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

/**
 * Customer self-service (brief Module 1 "Taxpayer/Customer: view own bills and assessments").
 * Scope is the payer linked to the user — ownership, not just the permission (standards §5).
 */
@ApiTags('self')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(SELF_API.PATH)
export class SelfController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payers: PayersService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.SELF_VIEW)
  @ApiOperation({ summary: 'My payer profile: assessments, payments and balances' })
  @ApiResponse({ status: HttpStatus.OK, type: PayerProfileResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User is not linked to a payer' })
  async profile(@CurrentUser() user: AuthenticatedUser): Promise<PayerProfileResponseDto> {
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { payerId: true },
    });
    if (row?.payerId === null || row?.payerId === undefined) {
      throw new AppException(ErrorCode.NOT_FOUND, SELF_MESSAGES.NOT_LINKED, HttpStatus.NOT_FOUND);
    }
    return this.payers.profile(row.payerId);
  }
}
