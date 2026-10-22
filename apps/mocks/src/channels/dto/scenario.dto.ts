import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

import {
  type ScenarioOutcome,
  ScenarioOutcome as Outcomes,
  type ScenarioRequest,
} from '@ircub/shared';

export class ScenarioDto implements ScenarioRequest {
  @ApiProperty({ example: 'BNK-ABC123' })
  @IsString()
  @MinLength(1)
  txnRef!: string;

  @ApiProperty({ enum: Object.values(Outcomes) })
  @IsIn(Object.values(Outcomes))
  outcome!: ScenarioOutcome;
}
