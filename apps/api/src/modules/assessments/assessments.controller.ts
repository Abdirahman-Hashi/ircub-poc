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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type Paginated, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { ASSESSMENTS_API } from './assessments.constants';
import { AssessmentsService } from './assessments.service';
import { AssessmentDetailResponseDto } from './dto/assessment-detail.response.dto';
import { AssessmentFilterDto } from './dto/assessment-filter.dto';
import { AssessmentResponseDto } from './dto/assessment.response.dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

@ApiTags('assessments')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(ASSESSMENTS_API.PATH)
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ASSESSMENTS_VIEW)
  @ApiOperation({
    summary:
      'List with advanced filters (payer, type, amount range, status, dates, control number)',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [AssessmentResponseDto] })
  list(@Query() filter: AssessmentFilterDto): Promise<Paginated<AssessmentResponseDto>> {
    return this.assessments.list(filter);
  }

  @Get(ASSESSMENTS_API.EXPORT)
  @RequirePermission(PERMISSIONS.ASSESSMENTS_VIEW)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', `attachment; filename="${ASSESSMENTS_API.EXPORT_FILE_NAME}"`)
  @ApiOperation({ summary: 'Export the filtered list as CSV' })
  @ApiProduces('text/csv')
  export(@Query() filter: AssessmentFilterDto): Promise<string> {
    return this.assessments.exportCsv(filter);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.ASSESSMENTS_VIEW)
  @ApiOperation({ summary: 'Assessment with its payments' })
  @ApiResponse({ status: HttpStatus.OK, type: AssessmentDetailResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<AssessmentDetailResponseDto> {
    return this.assessments.get(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ASSESSMENTS_CREATE)
  @ApiOperation({
    summary: 'Create an assessment; amount from the revenue type rate, control number generated',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: AssessmentResponseDto })
  create(
    @Body() dto: CreateAssessmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AssessmentResponseDto> {
    return this.assessments.create(dto, actor.id);
  }

  @Post(`:id/${ASSESSMENTS_API.CANCEL}`)
  @RequirePermission(PERMISSIONS.ASSESSMENTS_CREATE)
  @ApiOperation({ summary: 'Cancel an unpaid assessment' })
  @ApiResponse({ status: HttpStatus.CREATED, type: AssessmentResponseDto })
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<AssessmentResponseDto> {
    return this.assessments.cancel(id);
  }
}
