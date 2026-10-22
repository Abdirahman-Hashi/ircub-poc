import {
  Body,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiResponse } from '@nestjs/swagger';

import { PATHS } from '../mocks.constants';

import { ChannelsService } from './channels.service';
import { InitiateResponseDto, StatusResponseDto } from './dto/channel-responses.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { StatementQueryDto } from './dto/statement-query.dto';

import type { ChannelSpec } from './channels.types';
import type { Response } from 'express';

const PERTURB_ON = '1';

/** Shared handlers; the bank and momo controllers only differ by path prefix and ref prefix. */
export abstract class ChannelControllerBase {
  protected constructor(
    protected readonly channels: ChannelsService,
    protected readonly spec: ChannelSpec,
  ) {}

  @Post(PATHS.PAYMENTS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Initiate a payment; a signed callback follows after MOCK_CALLBACK_DELAY_MS (unless the amount ends in .77/.66)',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: InitiateResponseDto })
  initiate(@Body() dto: InitiatePaymentDto): InitiateResponseDto {
    const payment = this.channels.initiate(this.spec, dto);
    return { txnRef: payment.txnRef, status: payment.status };
  }

  @Get(`${PATHS.PAYMENTS}/:txnRef`)
  @ApiOperation({
    summary: 'Status check; `.66` amounts always fail with 500, `.77` report PENDING twice',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StatusResponseDto })
  async status(@Param('txnRef') txnRef: string): Promise<StatusResponseDto> {
    const { httpStatus, payment } = await this.channels.status(txnRef);
    if (payment === null) {
      throw new NotFoundException('unknown transaction');
    }
    if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
      throw new ServiceUnavailableException('channel status service error (forced by scenario)');
    }
    return {
      txnRef: payment.txnRef,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      controlNumber: payment.controlNumber,
      paidAt: payment.paidAt,
    };
  }

  @Get(PATHS.STATEMENTS)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({
    summary:
      'Daily statement of SUCCESS payments as CSV; `?perturb=1` drops, alters and adds a line',
  })
  @ApiProduces('text/csv')
  statement(@Query() query: StatementQueryDto, @Res({ passthrough: true }) res: Response): string {
    res.setHeader(
      'content-disposition',
      `attachment; filename="${this.spec.channel.toLowerCase()}-statement-${query.date}.csv"`,
    );
    return this.channels.statement(this.spec.channel, query.date, query.perturb === PERTURB_ON);
  }
}
