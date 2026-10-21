import {
  Controller,
  Get,
  Header,
  HttpStatus,
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

import { ErrorCode, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../../app.constants';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermission } from '../../../common/auth/require-permission.decorator';
import { CSV_IMPORT } from '../../../common/csv/csv.constants';
import { CSV_MESSAGES } from '../../../common/csv/csv.messages';
import { isCsvUpload } from '../../../common/csv/upload.rules';
import { AppException } from '../../../common/errors/app.exception';
import { BULK_MESSAGES } from '../../bulk-uploads/bulk-uploads.messages';
import { CsvSummaryResponseDto } from '../../bulk-uploads/dto/csv-summary.response.dto';
import { ImportQueryDto } from '../../bulk-uploads/dto/import-query.dto';

import { ReadingsImportService } from './readings-import.service';
import { READINGS_API } from './readings.constants';

import type { AuthenticatedUser } from '../../../common/auth/auth.types';

@ApiTags('bulk-uploads')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(READINGS_API.BULK_PATH)
export class ReadingsUploadController {
  constructor(private readonly importer: ReadingsImportService) {}

  @Get(READINGS_API.BULK_TEMPLATE)
  @RequirePermission(PERMISSIONS.METERS_READ)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', `attachment; filename="${READINGS_API.TEMPLATE_FILE_NAME}"`)
  @ApiOperation({ summary: 'Download the meter-readings CSV template' })
  @ApiProduces('text/csv')
  template(): string {
    return this.importer.template();
  }

  @Post(READINGS_API.BULK_METER_READINGS)
  @RequirePermission(PERMISSIONS.METERS_READ)
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
    summary: 'Import meter readings from CSV; `?dryRun=true` validates without saving',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: CsvSummaryResponseDto })
  import(
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
        { mimeType: file.mimetype },
      );
    }
    return this.importer.import(file.buffer, file.originalname, query.dryRun === true, actor.id);
  }
}
