import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChannelsService } from '../channels/channels.service';
import { ScenarioDto } from '../channels/dto/scenario.dto';
import { SeedStatementDto } from '../channels/dto/seed-statement.dto';
import { PATHS } from '../mocks.constants';
import { StoreService } from '../store/store.service';

import { ResetResponseDto } from './dto/reset.response.dto';

@ApiTags('control')
@Controller()
export class ControlController {
  constructor(
    private readonly store: StoreService,
    private readonly channels: ChannelsService,
  ) {}

  @Post(PATHS.RESET)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all in-memory state (tests and demos)' })
  @ApiResponse({ status: HttpStatus.OK, type: ResetResponseDto })
  reset(): ResetResponseDto {
    return { cleared: { ...this.store.reset() } };
  }

  @Post(PATHS.SCENARIO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Force the outcome of a transaction: SUCCESS, FAILED, TIMEOUT (status hangs 10 s) or NO_CALLBACK',
  })
  scenario(@Body() dto: ScenarioDto): void {
    this.channels.forceScenario(dto.txnRef, dto.outcome);
  }

  @Post(PATHS.SEED_STATEMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register settled payments so daily statements include seeded IRCUB payments',
  })
  seedStatement(@Body() dto: SeedStatementDto): { registered: number } {
    return { registered: this.channels.seedStatement(dto) };
  }
}
