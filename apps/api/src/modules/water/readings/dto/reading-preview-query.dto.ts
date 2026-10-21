import { OmitType } from '@nestjs/swagger';

import { CreateReadingDto } from './create-reading.dto';

/** Same inputs as a capture; nothing is saved. */
export class ReadingPreviewQueryDto extends OmitType(CreateReadingDto, [] as const) {}
