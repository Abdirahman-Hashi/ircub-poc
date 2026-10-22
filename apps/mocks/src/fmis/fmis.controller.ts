import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { FMIS } from '@ircub/shared';

import { PATHS } from '../mocks.constants';

import { JournalResponseDto } from './dto/journal.response.dto';
import { LedgerResponseDto } from './dto/ledger.response.dto';
import { PostJournalDto } from './dto/post-journal.dto';
import { shouldFail } from './fmis.rules';
import { FmisService } from './fmis.service';

import type { Response } from 'express';

const MESSAGES = {
  UNBALANCED: 'Journal is not balanced: total debits must equal total credits.',
  FORCED_FAILURE: 'FMIS unavailable (forced failure).',
} as const;

/** Simulated government FMIS (D17): idempotent journal posting and a per-day ledger. */
@ApiTags('fmis')
@Controller(PATHS.FMIS)
export class FmisController {
  private readonly logger = new Logger(FmisController.name);

  constructor(private readonly fmis: FmisService) {}

  @Post(PATHS.JOURNALS)
  @ApiOperation({
    summary: 'Post a journal batch; idempotent on batchId; `?fail=1` or a date ending in 13 → 500',
  })
  @ApiQuery({ name: FMIS.FAIL_QUERY, required: false })
  @ApiResponse({ status: HttpStatus.CREATED, type: JournalResponseDto })
  @ApiResponse({ status: HttpStatus.OK, type: JournalResponseDto, description: 'Repeated batch' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Unbalanced' })
  post(
    @Body() dto: PostJournalDto,
    @Query(FMIS.FAIL_QUERY) fail: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): JournalResponseDto {
    this.logger.log({
      msg: 'journal received',
      batchId: dto.batchId,
      date: dto.date,
      lines: dto.lines.length,
    });
    if (shouldFail(dto.date, fail)) {
      throw new HttpException(MESSAGES.FORCED_FAILURE, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const result = this.fmis.post(dto);
    if (result === null) {
      throw new HttpException(MESSAGES.UNBALANCED, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    res.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return { fmisReference: result.journal.fmisReference, status: FMIS.STATUS_POSTED };
  }

  @Get(PATHS.LEDGER)
  @ApiOperation({ summary: 'Totals per GL code from the journals posted for a day' })
  @ApiQuery({ name: FMIS.DATE_QUERY, example: '2026-10-21' })
  @ApiResponse({ status: HttpStatus.OK, type: LedgerResponseDto })
  ledger(@Query(FMIS.DATE_QUERY) date: string): LedgerResponseDto {
    return { date, entries: this.fmis.ledger(date) };
  }
}
