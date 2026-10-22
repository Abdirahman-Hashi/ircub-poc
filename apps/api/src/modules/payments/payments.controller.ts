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

import { CapturePaymentDto } from './dto/capture-payment.dto';
import { ControlNumberLookupDto } from './dto/control-number-lookup.dto';
import { ControlNumberLookupResponseDto } from './dto/control-number-lookup.response.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentDetailResponseDto } from './dto/payment-detail.response.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { PaymentResponseDto } from './dto/payment.response.dto';
import { PaymentInitiationService } from './payment-initiation.service';
import { PAYMENTS_API } from './payments.constants';
import { PaymentsService } from './payments.service';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

@ApiTags('payments')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(PAYMENTS_API.PATH)
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly initiation: PaymentInitiationService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.PAYMENTS_VIEW)
  @ApiOperation({
    summary:
      'List payments with filters (payer, revenue type, amount, channel, status, currency, dates)',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [PaymentResponseDto] })
  list(@Query() filter: PaymentFilterDto): Promise<Paginated<PaymentResponseDto>> {
    return this.payments.list(filter);
  }

  @Get(`${PAYMENTS_API.CAPTURE}/${PAYMENTS_API.LOOKUP}`)
  @RequirePermission(PERMISSIONS.PAYMENTS_CAPTURE)
  @ApiOperation({ summary: 'Resolve a control number to the payer and outstanding amount' })
  @ApiResponse({ status: HttpStatus.OK, type: ControlNumberLookupResponseDto })
  lookup(@Query() query: ControlNumberLookupDto): Promise<ControlNumberLookupResponseDto> {
    return this.payments.lookup(query.controlNumber);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PAYMENTS_VIEW)
  @ApiOperation({ summary: 'One payment with channel request/callback payloads' })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentDetailResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentDetailResponseDto> {
    return this.payments.getDetail(id);
  }

  @Post(PAYMENTS_API.INITIATE)
  @RequirePermission(PERMISSIONS.PAYMENTS_CAPTURE)
  @ApiOperation({ summary: 'Initiate an online bank / mobile-money payment for a control number' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PaymentResponseDto })
  @ApiResponse({ status: HttpStatus.SERVICE_UNAVAILABLE, description: 'CHANNEL_UNAVAILABLE' })
  initiate(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PaymentResponseDto> {
    return this.initiation.initiate(dto, actor.id, null);
  }

  @Post(PAYMENTS_API.CAPTURE)
  @RequirePermission(PERMISSIONS.PAYMENTS_CAPTURE)
  @ApiOperation({ summary: 'Record a cash / bank / mobile-money payment against a control number' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PaymentResponseDto })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'OVERPAYMENT' })
  capture(
    @Body() dto: CapturePaymentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PaymentResponseDto> {
    return this.payments.capture(dto, actor.id);
  }
}
