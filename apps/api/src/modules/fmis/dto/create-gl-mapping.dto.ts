import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Matches, MinLength } from 'class-validator';

import { FMIS } from '@ircub/shared';

import { FMIS_API } from '../fmis.constants';

export class CreateGlMappingDto {
  @ApiProperty()
  @IsUUID()
  revenueTypeId!: string;

  @ApiProperty({ example: '4100', description: '4 to 6 digits' })
  @Matches(FMIS.GL_CODE_PATTERN)
  glCode!: string;

  @ApiProperty({ example: 'Business licence revenue' })
  @IsString()
  @MinLength(1)
  glName!: string;

  @ApiProperty({ example: '2026-01-01', description: 'First batch date the mapping applies to' })
  @Matches(FMIS_API.DATE_PATTERN)
  effectiveFrom!: string;
}
