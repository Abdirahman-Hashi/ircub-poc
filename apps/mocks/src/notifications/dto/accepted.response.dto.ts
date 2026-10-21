import { ApiProperty } from '@nestjs/swagger';

export class AcceptedResponseDto {
  @ApiProperty({ example: 'accepted' })
  status!: string;

  @ApiProperty({ example: 'msg-1' })
  messageId!: string;
}
