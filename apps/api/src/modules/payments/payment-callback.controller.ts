import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CHANNEL, ErrorCode, PaymentChannel } from '@ircub/shared';

import { Public } from '../../common/auth/public.decorator';
import { AppException } from '../../common/errors/app.exception';
import { AppConfigService } from '../../config/app-config.service';
import { verifyCallbackSignature } from '../channels/channels.rules';

import { CallbackResponseDto } from './dto/callback.response.dto';
import { ChannelCallbackDto } from './dto/channel-callback.dto';
import { PaymentSettlementService } from './payment-settlement.service';
import { CALLBACK_THROTTLE, PAYMENTS_API } from './payments.constants';
import { PAYMENTS_MESSAGES } from './payments.messages';

import type { Request } from 'express';

/**
 * Unauthenticated webhook the channels call back (D15). Trust comes from the HMAC over the
 * raw body with `MOCK_SHARED_SECRET`, compared in constant time; replays are idempotent.
 */
@ApiTags('payments')
@Controller(PAYMENTS_API.PATH)
export class PaymentCallbackController {
  constructor(
    private readonly settlement: PaymentSettlementService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Throttle({ default: CALLBACK_THROTTLE })
  @Post(`${PAYMENTS_API.CALLBACK}/:channel`)
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: CHANNEL.SIGNATURE_HEADER, description: 'hex HMAC-SHA256 of the raw body' })
  @ApiOperation({ summary: 'Signed channel callback (idempotent)' })
  @ApiResponse({ status: HttpStatus.OK, type: CallbackResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'INVALID_SIGNATURE' })
  async callback(
    @Param('channel', new ParseEnumPipe(PaymentChannel)) channel: PaymentChannel,
    @Headers(CHANNEL.SIGNATURE_HEADER) signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
    @Body() dto: ChannelCallbackDto,
  ): Promise<CallbackResponseDto> {
    if (!verifyCallbackSignature(req.rawBody ?? '', signature, this.config.mockSharedSecret)) {
      throw new AppException(
        ErrorCode.INVALID_SIGNATURE,
        PAYMENTS_MESSAGES.INVALID_SIGNATURE,
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.settlement.settleByReference(
      channel,
      dto.txnRef,
      { status: dto.status, amount: dto.amount, currency: dto.currency, paidAt: dto.paidAt },
      'CALLBACK',
      {
        txnRef: dto.txnRef,
        status: dto.status,
        amount: dto.amount,
        currency: dto.currency,
        controlNumber: dto.controlNumber,
        paidAt: dto.paidAt,
      },
    );
  }
}
