import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PATHS } from '../mocks.constants';
import { StoreService } from '../store/store.service';

import { ResetResponseDto } from './dto/reset.response.dto';

@ApiTags('control')
@Controller()
export class ControlController {
  constructor(private readonly store: StoreService) {}

  @Post(PATHS.RESET)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all in-memory state (tests and demos)' })
  @ApiResponse({ status: HttpStatus.OK, type: ResetResponseDto })
  reset(): ResetResponseDto {
    return { cleared: { ...this.store.reset() } };
  }
}
