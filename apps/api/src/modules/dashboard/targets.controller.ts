import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermission } from '../../common/auth/require-permission.decorator';
import { CSV_IMPORT } from '../../common/csv/csv.constants';
import { CSV_MESSAGES } from '../../common/csv/csv.messages';
import { isCsvUpload } from '../../common/csv/upload.rules';
import { AppException } from '../../common/errors/app.exception';
import { CsvSummaryResponseDto } from '../bulk-uploads/dto/csv-summary.response.dto';
import { ImportQueryDto } from '../bulk-uploads/dto/import-query.dto';

import { DASHBOARD_API, REVENUE_TARGETS_TEMPLATE } from './dashboard.constants';
import { DASHBOARD_MESSAGES } from './dashboard.messages';
import { PeriodRangeQueryDto } from './dto/period-range-query.dto';
import { RevenueTargetResponseDto } from './dto/revenue-target.response.dto';
import { UpsertTargetDto } from './dto/upsert-target.dto';
import { TargetsService } from './targets.service';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

@ApiTags('dashboard')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(DASHBOARD_API.TARGETS_PATH)
export class TargetsController {
  constructor(private readonly targets: TargetsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Revenue targets for a period range' })
  @ApiResponse({ status: HttpStatus.OK, type: [RevenueTargetResponseDto] })
  list(@Query() query: PeriodRangeQueryDto): Promise<RevenueTargetResponseDto[]> {
    return this.targets.list(query.from, query.to);
  }

  @Put()
  @RequirePermission(PERMISSIONS.TARGETS_MANAGE)
  @ApiOperation({ summary: 'Set the target for a period and revenue type (upsert)' })
  @ApiResponse({ status: HttpStatus.OK, type: RevenueTargetResponseDto })
  upsert(
    @Body() dto: UpsertTargetDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<RevenueTargetResponseDto> {
    return this.targets.upsert(dto, actor.id);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.TARGETS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a target' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.targets.remove(id);
  }

  @Get(DASHBOARD_API.TEMPLATE)
  @RequirePermission(PERMISSIONS.TARGETS_MANAGE)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', `attachment; filename="${REVENUE_TARGETS_TEMPLATE.fileName}"`)
  @ApiOperation({ summary: 'Download the revenue-targets CSV template' })
  @ApiProduces('text/csv')
  template(): string {
    return this.targets.template();
  }

  @Post(DASHBOARD_API.IMPORT)
  @RequirePermission(PERMISSIONS.TARGETS_MANAGE)
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
    summary: 'Import targets from CSV (period, revenue_type_code, amount); `?dryRun=true` previews',
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
        DASHBOARD_MESSAGES.TARGET_NOT_FOUND,
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
    return this.targets.import(file.buffer, query.dryRun ?? false, actor.id);
  }
}
