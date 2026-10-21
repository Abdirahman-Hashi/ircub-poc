import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PayerStatus, PayerType, type PayerView } from '@ircub/shared';

export class PayerResponseDto implements PayerView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'TIN1234567890' })
  tin!: string;

  @ApiProperty({ enum: PayerType })
  type!: PayerType;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  nationalId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  registrationNo!: string | null;

  @ApiProperty({ example: '+252612345678' })
  phone!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiProperty({ enum: PayerStatus })
  status!: PayerStatus;

  @ApiProperty()
  createdAt!: Date;
}
