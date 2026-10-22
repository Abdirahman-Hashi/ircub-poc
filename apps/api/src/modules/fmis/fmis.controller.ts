import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type Paginated, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { BuildBatchDto } from './dto/build-batch.dto';
import { BuildRangeDto } from './dto/build-range.dto';
import { BuildRangeResponseDto } from './dto/build-range.response.dto';
import { FmisReconciliationDrilldownResponseDto } from './dto/fmis-reconciliation-drilldown.response.dto';
import { FmisReconciliationQueryDto } from './dto/fmis-reconciliation-query.dto';
import { FmisReconciliationRowResponseDto } from './dto/fmis-reconciliation-row.response.dto';
import { JournalBatchDetailResponseDto } from './dto/journal-batch-detail.response.dto';
import { JournalBatchFilterDto } from './dto/journal-batch-filter.dto';
import { JournalBatchResponseDto } from './dto/journal-batch.response.dto';
import { JournalLineQueryDto } from './dto/journal-line-query.dto';
import { JournalLineResponseDto } from './dto/journal-line.response.dto';
import { FmisReconciliationService } from './fmis-reconciliation.service';
import { FMIS_API } from './fmis.constants';
import { JournalBatchService } from './journal-batch.service';

@ApiTags('fmis')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(FMIS_API.PATH)
export class FmisController {
  constructor(
    private readonly batches: JournalBatchService,
    private readonly reconciliation: FmisReconciliationService,
  ) {}

  @Post(`${FMIS_API.BATCHES}/${FMIS_API.BUILD}`)
  @RequirePermission(PERMISSIONS.FMIS_POST)
  @ApiOperation({
    summary:
      'Build the journal batch for a day and enqueue posting (null when nothing is eligible)',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: JournalBatchResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'DUPLICATE_POSTING' })
  build(@Body() dto: BuildBatchDto): Promise<JournalBatchResponseDto | null> {
    return this.batches.buildForDate(dto.date, dto.forceFailure ?? false, dto.catchUp ?? true);
  }

  @Post(`${FMIS_API.BATCHES}/${FMIS_API.BUILD_RANGE}`)
  @RequirePermission(PERMISSIONS.FMIS_POST)
  @ApiOperation({ summary: 'Build one batch per day in a range (backfill / demo)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: BuildRangeResponseDto })
  buildRange(@Body() dto: BuildRangeDto): Promise<BuildRangeResponseDto> {
    return this.batches.buildRange(dto.from, dto.to, dto.catchUp ?? true);
  }

  @Post(`${FMIS_API.BATCHES}/:id/${FMIS_API.RETRY}`)
  @RequirePermission(PERMISSIONS.FMIS_POST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-enqueue a FAILED batch' })
  @ApiResponse({ status: HttpStatus.OK, type: JournalBatchResponseDto })
  retry(@Param('id', ParseUUIDPipe) id: string): Promise<JournalBatchResponseDto> {
    return this.batches.retry(id);
  }

  @Get(FMIS_API.BATCHES)
  @RequirePermission(PERMISSIONS.FMIS_VIEW)
  @ApiOperation({ summary: 'Journal batches (filter by date range, status, kind)' })
  @ApiResponse({ status: HttpStatus.OK, type: [JournalBatchResponseDto] })
  list(@Query() filter: JournalBatchFilterDto): Promise<Paginated<JournalBatchResponseDto>> {
    return this.batches.list(filter);
  }

  @Get(`${FMIS_API.BATCHES}/:id`)
  @RequirePermission(PERMISSIONS.FMIS_VIEW)
  @ApiOperation({ summary: 'One batch with its lines (payment, payer, control number, GL)' })
  @ApiResponse({ status: HttpStatus.OK, type: JournalBatchDetailResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<JournalBatchDetailResponseDto> {
    return this.batches.get(id);
  }

  @Get(FMIS_API.LINES)
  @RequirePermission(PERMISSIONS.FMIS_VIEW)
  @ApiOperation({ summary: 'Journal lines for a payment id or control number (traceability)' })
  @ApiResponse({ status: HttpStatus.OK, type: [JournalLineResponseDto] })
  lines(@Query() query: JournalLineQueryDto): Promise<JournalLineResponseDto[]> {
    return this.batches.lines(query);
  }

  @Get(FMIS_API.RECONCILIATION)
  @RequirePermission(PERMISSIONS.FMIS_VIEW)
  @ApiOperation({ summary: 'IRCUB posted totals vs FMIS ledger per day and GL' })
  @ApiResponse({ status: HttpStatus.OK, type: [FmisReconciliationRowResponseDto] })
  reconcile(
    @Query() query: FmisReconciliationQueryDto,
  ): Promise<FmisReconciliationRowResponseDto[]> {
    return this.reconciliation.rows(query.from, query.to);
  }

  @Get(`${FMIS_API.RECONCILIATION}/${FMIS_API.EXPORT}`)
  @RequirePermission(PERMISSIONS.FMIS_VIEW)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', `attachment; filename="${FMIS_API.EXPORT_FILE_NAME}"`)
  @ApiOperation({ summary: 'Export the reconciliation matrix as CSV' })
  @ApiProduces('text/csv')
  exportCsv(@Query() query: FmisReconciliationQueryDto): Promise<string> {
    return this.reconciliation.exportCsv(query.from, query.to);
  }

  @Get(`${FMIS_API.RECONCILIATION}/:date/:glCode`)
  @RequirePermission(PERMISSIONS.FMIS_VIEW)
  @ApiOperation({ summary: 'Drill-down: posted lines behind one day and GL' })
  @ApiResponse({ status: HttpStatus.OK, type: FmisReconciliationDrilldownResponseDto })
  drilldown(
    @Param('date') date: string,
    @Param('glCode') glCode: string,
  ): Promise<FmisReconciliationDrilldownResponseDto> {
    return this.reconciliation.drilldown(date, glCode);
  }
}
