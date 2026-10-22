import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ErrorCode, type ErrorResponse } from '@ircub/shared';

/** The envelope every non-2xx response carries (global exception filter). */
export class ErrorResponseDto implements ErrorResponse {
  @ApiProperty({ example: 403 })
  statusCode!: number;

  @ApiProperty({
    enum: ErrorCode,
    example: ErrorCode.SOD_VIOLATION,
    description: 'Stable machine-readable code',
  })
  code!: ErrorCode;

  @ApiProperty({ example: 'The user who captured a reversal cannot approve it.' })
  message!: string;

  @ApiPropertyOptional({ description: 'Context for the error (ids, limits, conflicts)' })
  details?: unknown;

  @ApiPropertyOptional({ description: 'Correlation id, also in the x-request-id header' })
  requestId?: string;
}
