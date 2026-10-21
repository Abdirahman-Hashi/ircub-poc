import {
  Controller,
  Get,
  Header,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../../app.constants';
import { RequirePermission } from '../../../common/auth/require-permission.decorator';
import { ACCOUNTS_API } from '../accounts/accounts.constants';
import { WATER } from '../water.constants';

import { StatementQueryDto } from './dto/statement-query.dto';
import { StatementResponseDto } from './dto/statement.response.dto';
import { StatementsService } from './statements.service';

@ApiTags('water')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(ACCOUNTS_API.PATH)
export class StatementsController {
  constructor(private readonly statements: StatementsService) {}

  @Get(`:id/${ACCOUNTS_API.STATEMENT}`)
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiOperation({ summary: 'Bills and payments with running balance' })
  @ApiResponse({ status: HttpStatus.OK, type: StatementResponseDto })
  statement(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StatementQueryDto,
  ): Promise<StatementResponseDto> {
    return this.statements.build(id, query.from, query.to);
  }

  @Get(`:id/${ACCOUNTS_API.STATEMENT_PDF}`)
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @Header('Content-Type', WATER.PDF_MIME)
  @ApiOperation({ summary: 'Statement as PDF' })
  @ApiProduces(WATER.PDF_MIME)
  async statementPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StatementQueryDto,
  ): Promise<StreamableFile> {
    const buffer = await this.statements.pdf(id, query.from, query.to);
    return new StreamableFile(buffer, {
      type: WATER.PDF_MIME,
      disposition: `inline; filename="statement-${id}.pdf"`,
    });
  }
}
