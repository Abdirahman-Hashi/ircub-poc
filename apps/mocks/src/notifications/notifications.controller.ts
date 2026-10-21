import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { NOTIFICATION_CHANNEL, PATHS } from '../mocks.constants';
import { StoreService } from '../store/store.service';

import { AcceptedResponseDto } from './dto/accepted.response.dto';
import { OutboxMessageResponseDto } from './dto/outbox-message.response.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmsDto } from './dto/send-sms.dto';

/** Simulated SMS and email gateways (D20): everything "sent" lands in the outbox for the demo. */
@ApiTags('notifications')
@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly store: StoreService) {}

  @Post(PATHS.SMS)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Accept an SMS' })
  @ApiResponse({ status: HttpStatus.ACCEPTED, type: AcceptedResponseDto })
  sms(@Body() dto: SendSmsDto): AcceptedResponseDto {
    return this.accept(NOTIFICATION_CHANNEL.SMS, dto.to, dto.body);
  }

  @Post(PATHS.EMAIL)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Accept an email' })
  @ApiResponse({ status: HttpStatus.ACCEPTED, type: AcceptedResponseDto })
  email(@Body() dto: SendEmailDto): AcceptedResponseDto {
    return this.accept(NOTIFICATION_CHANNEL.EMAIL, dto.to, dto.body, dto.subject);
  }

  @Get(PATHS.OUTBOX)
  @ApiOperation({ summary: 'Everything sent, newest first' })
  @ApiResponse({ status: HttpStatus.OK, type: [OutboxMessageResponseDto] })
  outbox(): OutboxMessageResponseDto[] {
    return [...this.store.outbox].reverse().map((message) => ({
      channel: message.channel,
      to: message.to,
      ...(message.subject === undefined ? {} : { subject: message.subject }),
      body: message.body,
      sentAt: message.sentAt,
    }));
  }

  private accept(channel: string, to: string, body: string, subject?: string): AcceptedResponseDto {
    const sentAt = new Date().toISOString();
    this.store.outbox.push({
      channel,
      to,
      body,
      sentAt,
      ...(subject === undefined ? {} : { subject }),
    });
    const messageId = `${NOTIFICATION_CHANNEL.MESSAGE_PREFIX}${this.store.outbox.length}`;
    this.logger.log({ msg: 'notification accepted', channel, to, messageId });
    return { status: NOTIFICATION_CHANNEL.ACCEPTED, messageId };
  }
}
