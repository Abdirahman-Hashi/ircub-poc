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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { ErrorCode, type Paginated, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermission } from '../../common/auth/require-permission.decorator';
import { CSV_IMPORT } from '../../common/csv/csv.constants';
import { CSV_MESSAGES } from '../../common/csv/csv.messages';
import { isCsvUpload } from '../../common/csv/upload.rules';
import { AppException } from '../../common/errors/app.exception';

import { ChannelStatementResponseDto } from './dto/channel-statement.response.dto';
import { ReconciliationLineFilterDto } from './dto/reconciliation-line-filter.dto';
import { ReconciliationRunDetailResponseDto } from './dto/reconciliation-run-detail.response.dto';
import { ReconciliationRunFilterDto } from './dto/reconciliation-run-filter.dto';
import { ReconciliationRunResponseDto } from './dto/reconciliation-run.response.dto';
import { RunReconciliationDto } from './dto/run-reconciliation.dto';
import { UploadStatementDto } from './dto/upload-statement.dto';
import { RECONCILIATION_API } from './reconciliation.constants';
import { RECONCILIATION_MESSAGES } from './reconciliation.messages';
import { ReconciliationService } from './reconciliation.service';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

@ApiTags('reconciliation')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(RECONCILIATION_API.PATH)
export class ReconciliationController {
  constructor(private readonly reconciliation: ReconciliationService) {}

  @Post(RECONCILIATION_API.RUNS)
  @RequirePermission(PERMISSIONS.RECONCILIATION_RUN)
  @ApiOperation({ summary: 'Fetch the channel statement for a day and reconcile it' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ReconciliationRunResponseDto })
  run(
    @Body() dto: RunReconciliationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ReconciliationRunResponseDto> {
    return this.reconciliation.runForChannel(dto.channel, dto.date, dto.perturb ?? false, actor.id);
  }

  @Get(RECONCILIATION_API.RUNS)
  @RequirePermission(PERMISSIONS.RECONCILIATION_VIEW)
  @ApiOperation({ summary: 'List reconciliation runs' })
  @ApiResponse({ status: HttpStatus.OK, type: [ReconciliationRunResponseDto] })
  list(
    @Query() filter: ReconciliationRunFilterDto,
  ): Promise<Paginated<ReconciliationRunResponseDto>> {
    return this.reconciliation.listRuns(filter);
  }

  @Get(`${RECONCILIATION_API.RUNS}/:id`)
  @RequirePermission(PERMISSIONS.RECONCILIATION_VIEW)
  @ApiOperation({ summary: 'One run with its lines (filter by status)' })
  @ApiResponse({ status: HttpStatus.OK, type: ReconciliationRunDetailResponseDto })
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filter: ReconciliationLineFilterDto,
  ): Promise<ReconciliationRunDetailResponseDto> {
    return this.reconciliation.getRun(id, filter);
  }

  @Get(`${RECONCILIATION_API.RUNS}/:id/${RECONCILIATION_API.EXPORT}`)
  @RequirePermission(PERMISSIONS.RECONCILIATION_VIEW)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', `attachment; filename="${RECONCILIATION_API.EXPORT_FILE_NAME}"`)
  @ApiOperation({ summary: 'Export the run lines as CSV' })
  @ApiProduces('text/csv')
  export(@Param('id', ParseUUIDPipe) id: string): Promise<string> {
    return this.reconciliation.exportCsv(id);
  }

  @Get(RECONCILIATION_API.STATEMENTS)
  @RequirePermission(PERMISSIONS.RECONCILIATION_VIEW)
  @ApiOperation({ summary: 'Stored channel statements' })
  @ApiResponse({ status: HttpStatus.OK, type: [ChannelStatementResponseDto] })
  statements(): Promise<ChannelStatementResponseDto[]> {
    return this.reconciliation.listStatements();
  }

  @Post(RECONCILIATION_API.STATEMENTS)
  @RequirePermission(PERMISSIONS.RECONCILIATION_RUN)
  @UseInterceptors(
    FileInterceptor(CSV_IMPORT.FILE_FIELD, {
      storage: memoryStorage(),
      limits: { fileSize: CSV_IMPORT.MAX_FILE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        channel: { type: 'string' },
        date: { type: 'string', example: '2026-10-21' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a channel statement file manually and reconcile it' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ReconciliationRunResponseDto })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'STATEMENT_INVALID' })
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadStatementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ReconciliationRunResponseDto> {
    if (file === undefined) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        RECONCILIATION_MESSAGES.FILE_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!isCsvUpload(file.mimetype, file.originalname)) {
      throw new AppException(
        ErrorCode.UNSUPPORTED_FILE_TYPE,
        CSV_MESSAGES.UNSUPPORTED_FILE_TYPE,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        {
          mimeType: file.mimetype,
        },
      );
    }
    return this.reconciliation.importStatement(
      dto.channel,
      dto.date,
      file.originalname,
      file.buffer.toString(CSV_IMPORT.ENCODING),
      actor.id,
    );
  }
}
