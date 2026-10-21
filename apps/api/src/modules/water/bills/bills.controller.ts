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

import { type Paginated, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../../app.constants';
import { RequirePermission } from '../../../common/auth/require-permission.decorator';
import { BillingService } from '../billing/billing.service';
import { FlagNoteDto } from '../billing/dto/flag-note.dto';
import { WATER } from '../water.constants';

import { BILLS_API } from './bills.constants';
import { BillsService } from './bills.service';
import { BillFilterDto } from './dto/bill-filter.dto';
import { BillResponseDto } from './dto/bill.response.dto';

@ApiTags('water')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(BILLS_API.PATH)
export class BillsController {
  constructor(
    private readonly bills: BillsService,
    private readonly billing: BillingService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiOperation({ summary: 'Bills with filters (cycle, account, payer, status, flagged, number)' })
  @ApiResponse({ status: HttpStatus.OK, type: [BillResponseDto] })
  list(@Query() filter: BillFilterDto): Promise<Paginated<BillResponseDto>> {
    return this.bills.list(filter);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiResponse({ status: HttpStatus.OK, type: BillResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<BillResponseDto> {
    return this.bills.get(id);
  }

  @Get(`:id/${BILLS_API.PDF}`)
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @Header('Content-Type', WATER.PDF_MIME)
  @ApiOperation({ summary: 'Bill PDF (rendered on first request for released bills)' })
  @ApiProduces(WATER.PDF_MIME)
  async pdf(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    const { stream, fileName } = await this.bills.pdfStream(id);
    return new StreamableFile(stream, {
      type: WATER.PDF_MIME,
      disposition: `inline; filename="${fileName}"`,
    });
  }

  @Post(`:id/${BILLS_API.CLEAR_FLAG}`)
  @RequirePermission(PERMISSIONS.BILLING_RELEASE)
  @ApiOperation({
    summary: 'Reviewer accepts the reading: bill unflagged and eligible for release',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: BillResponseDto })
  clearFlag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FlagNoteDto,
  ): Promise<BillResponseDto> {
    return this.billing.clearFlag(id, dto.note);
  }

  @Post(`:id/${BILLS_API.CONFIRM_FLAG}`)
  @RequirePermission(PERMISSIONS.BILLING_RELEASE)
  @ApiOperation({ summary: 'Reviewer confirms the anomaly: bill stays held with a note' })
  @ApiResponse({ status: HttpStatus.CREATED, type: BillResponseDto })
  confirmFlag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FlagNoteDto,
  ): Promise<BillResponseDto> {
    return this.billing.confirmFlag(id, dto.note);
  }
}
