import {
  Body,
  Controller,
  Get,
  Header,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ErrorCode, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermission } from '../../common/auth/require-permission.decorator';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { PayerProfileResponseDto } from '../payers/dto/payer-profile.response.dto';
import { PayersService } from '../payers/payers.service';
import { InitiatePaymentDto } from '../payments/dto/initiate-payment.dto';
import { PaymentResponseDto } from '../payments/dto/payment.response.dto';
import { PaymentInitiationService } from '../payments/payment-initiation.service';
import { BillsService } from '../water/bills/bills.service';
import { StatementQueryDto } from '../water/statements/dto/statement-query.dto';
import { StatementResponseDto } from '../water/statements/dto/statement.response.dto';
import { StatementsService } from '../water/statements/statements.service';
import { WATER } from '../water/water.constants';

import { SELF_API } from './self.constants';
import { SELF_MESSAGES } from './self.messages';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

/**
 * Customer self-service (brief Module 1 "view own bills and assessments"). Scope is the
 * payer linked to the user — ownership, not just the permission (standards §5).
 */
@ApiTags('self')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(SELF_API.PATH)
export class SelfController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payers: PayersService,
    private readonly bills: BillsService,
    private readonly statements: StatementsService,
    private readonly initiation: PaymentInitiationService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.SELF_VIEW)
  @ApiOperation({
    summary: 'My payer profile: assessments, water accounts, bills, payments and balances',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PayerProfileResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User is not linked to a payer' })
  async profile(@CurrentUser() user: AuthenticatedUser): Promise<PayerProfileResponseDto> {
    return this.payers.profile(await this.ownPayerId(user));
  }

  @Get(`${SELF_API.BILLS}/:id/${SELF_API.PDF}`)
  @RequirePermission(PERMISSIONS.SELF_VIEW)
  @Header('Content-Type', WATER.PDF_MIME)
  @ApiOperation({ summary: 'My bill as PDF (own payer only)' })
  @ApiProduces(WATER.PDF_MIME)
  async billPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { stream, fileName } = await this.bills.pdfStream(id, await this.ownPayerId(user));
    return new StreamableFile(stream, {
      type: WATER.PDF_MIME,
      disposition: `inline; filename="${fileName}"`,
    });
  }

  @Get(`${SELF_API.WATER_ACCOUNTS}/:id/${SELF_API.STATEMENT}`)
  @RequirePermission(PERMISSIONS.SELF_VIEW)
  @ApiOperation({ summary: 'My account statement with running balance (own payer only)' })
  @ApiResponse({ status: HttpStatus.OK, type: StatementResponseDto })
  async statement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StatementQueryDto,
  ): Promise<StatementResponseDto> {
    return this.statements.build(id, query.from, query.to, await this.ownPayerId(user));
  }

  @Post(`${SELF_API.PAYMENTS}/${SELF_API.INITIATE}`)
  @RequirePermission(PERMISSIONS.SELF_PAY)
  @ApiOperation({ summary: 'Pay one of my own assessments or bills via bank or mobile money' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PaymentResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'NOT_OWN_PAYER' })
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentResponseDto> {
    return this.initiation.initiate(dto, user.id, await this.ownPayerId(user));
  }

  private async ownPayerId(user: AuthenticatedUser): Promise<string> {
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { payerId: true },
    });
    if (row?.payerId === null || row?.payerId === undefined) {
      throw new AppException(ErrorCode.NOT_FOUND, SELF_MESSAGES.NOT_LINKED, HttpStatus.NOT_FOUND);
    }
    return row.payerId;
  }
}
