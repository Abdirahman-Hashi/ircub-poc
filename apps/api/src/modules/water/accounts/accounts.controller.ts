import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type Paginated, PERMISSIONS, WaterAccountStatus } from '@ircub/shared';

import { SWAGGER } from '../../../app.constants';
import { RequirePermission } from '../../../common/auth/require-permission.decorator';

import { ACCOUNTS_API } from './accounts.constants';
import { AccountsService } from './accounts.service';
import { CreateWaterAccountDto } from './dto/create-water-account.dto';
import { WaterAccountFilterDto } from './dto/water-account-filter.dto';
import { WaterAccountResponseDto } from './dto/water-account.response.dto';

@ApiTags('water')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(ACCOUNTS_API.PATH)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiOperation({ summary: 'Water accounts with meters and outstanding balance' })
  @ApiResponse({ status: HttpStatus.OK, type: [WaterAccountResponseDto] })
  list(@Query() filter: WaterAccountFilterDto): Promise<Paginated<WaterAccountResponseDto>> {
    return this.accounts.list(filter);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiResponse({ status: HttpStatus.OK, type: WaterAccountResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<WaterAccountResponseDto> {
    return this.accounts.get(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PAYERS_REGISTER)
  @ApiOperation({
    summary: 'Open a water account for a payer, optionally installing the first meter',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: WaterAccountResponseDto })
  create(@Body() dto: CreateWaterAccountDto): Promise<WaterAccountResponseDto> {
    return this.accounts.create(dto);
  }

  @Post(`:id/${ACCOUNTS_API.DISCONNECT}`)
  @RequirePermission(PERMISSIONS.PAYERS_REGISTER)
  @ApiResponse({ status: HttpStatus.CREATED, type: WaterAccountResponseDto })
  disconnect(@Param('id', ParseUUIDPipe) id: string): Promise<WaterAccountResponseDto> {
    return this.accounts.setStatus(id, WaterAccountStatus.DISCONNECTED);
  }

  @Post(`:id/${ACCOUNTS_API.RECONNECT}`)
  @RequirePermission(PERMISSIONS.PAYERS_REGISTER)
  @ApiResponse({ status: HttpStatus.CREATED, type: WaterAccountResponseDto })
  reconnect(@Param('id', ParseUUIDPipe) id: string): Promise<WaterAccountResponseDto> {
    return this.accounts.setStatus(id, WaterAccountStatus.ACTIVE);
  }
}
