import { ApiProperty } from '@nestjs/swagger';

import type { RegisteredPayer } from '@ircub/shared';

import { DuplicateFlagResponseDto } from './duplicate-flag.response.dto';
import { PayerResponseDto } from './payer.response.dto';

export class RegisteredPayerResponseDto extends PayerResponseDto implements RegisteredPayer {
  @ApiProperty({
    type: [DuplicateFlagResponseDto],
    description: 'Possible duplicates raised by this registration',
  })
  warnings!: DuplicateFlagResponseDto[];
}
