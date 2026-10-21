import {
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

import { BULK_UPLOADS_API } from './bulk-uploads.constants';
import { BULK_MESSAGES } from './bulk-uploads.messages';
import { BulkUploadsService } from './bulk-uploads.service';
import { BulkUploadFilterDto } from './dto/bulk-upload-filter.dto';
import { BulkUploadResponseDto } from './dto/bulk-upload.response.dto';
import { CsvSummaryResponseDto } from './dto/csv-summary.response.dto';
import { ImportQueryDto } from './dto/import-query.dto';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

@ApiTags('bulk-uploads')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(BULK_UPLOADS_API.PATH)
export class BulkUploadsController {
  constructor(private readonly uploads: BulkUploadsService) {}

  @Get(BULK_UPLOADS_API.TEMPLATE)
  @RequirePermission(PERMISSIONS.BULK_UPLOADS_CREATE)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', `attachment; filename="revenue-transactions-template.csv"`)
  @ApiOperation({ summary: 'Download the revenue-transactions CSV template' })
  @ApiProduces('text/csv')
  template(): string {
    return this.uploads.template();
  }

  @Post(BULK_UPLOADS_API.REVENUE_TRANSACTIONS)
  @RequirePermission(PERMISSIONS.BULK_UPLOADS_CREATE)
  @UseInterceptors(
    FileInterceptor(CSV_IMPORT.FILE_FIELD, {
      storage: memoryStorage(),
      limits: { fileSize: CSV_IMPORT.MAX_FILE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({
    summary: 'Import revenue transactions from CSV; `?dryRun=true` validates without saving',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: CsvSummaryResponseDto })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'CSV_INVALID | CSV_TOO_MANY_ROWS',
  })
  importRevenueTransactions(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query() query: ImportQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CsvSummaryResponseDto> {
    if (file === undefined) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        BULK_MESSAGES.FILE_REQUIRED,
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
    return this.uploads.importRevenueTransactions(
      file.buffer,
      file.originalname,
      query.dryRun === true,
      actor.id,
    );
  }

  @Get()
  @RequirePermission(PERMISSIONS.BULK_UPLOADS_CREATE)
  @ApiOperation({ summary: 'Past uploads' })
  @ApiResponse({ status: HttpStatus.OK, type: [BulkUploadResponseDto] })
  list(@Query() filter: BulkUploadFilterDto): Promise<Paginated<BulkUploadResponseDto>> {
    return this.uploads.list(filter);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.BULK_UPLOADS_CREATE)
  @ApiOperation({ summary: 'Upload with its full summary and rejected rows' })
  @ApiResponse({ status: HttpStatus.OK, type: BulkUploadResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<BulkUploadResponseDto> {
    return this.uploads.get(id);
  }
}
