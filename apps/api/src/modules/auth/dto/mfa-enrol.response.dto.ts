import { ApiProperty } from '@nestjs/swagger';

import type { MfaEnrolResponse } from '@ircub/shared';

export class MfaEnrolResponseDto implements MfaEnrolResponse {
  @ApiProperty({ description: 'otpauth://totp/… URI to render as a QR code' })
  otpauthUrl!: string;

  @ApiProperty({ description: 'Base32 secret for manual entry' })
  secret!: string;
}
