import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type Paginated, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { AUDIT_API } from './audit.constants';
import { AuditService } from './audit.service';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { AuditLogResponseDto } from './dto/audit-log.response.dto';
import { ChainVerifyResponseDto } from './dto/chain-verify.response.dto';

@ApiTags('audit')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(AUDIT_API.PATH)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  @ApiOperation({ summary: 'List audit rows (newest first) with filters' })
  @ApiResponse({ status: HttpStatus.OK, type: [AuditLogResponseDto] })
  list(@Query() filter: AuditFilterDto): Promise<Paginated<AuditLogResponseDto>> {
    return this.audit.list(filter);
  }

  @Get(AUDIT_API.VERIFY_PATH)
  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  @ApiOperation({ summary: 'Recompute the hash chain from genesis and report the first break' })
  @ApiResponse({ status: HttpStatus.OK, type: ChainVerifyResponseDto })
  verify(): Promise<ChainVerifyResponseDto> {
    return this.audit.verify();
  }
}
