import { PartialType } from '@nestjs/swagger';

import { CreatePayerDto } from './create-payer.dto';

export class UpdatePayerDto extends PartialType(CreatePayerDto) {}
