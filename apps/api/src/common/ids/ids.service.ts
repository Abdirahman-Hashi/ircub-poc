import { randomInt } from 'node:crypto';

import { HttpStatus, Injectable } from '@nestjs/common';

import { ErrorCode } from '@ircub/shared';

import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../errors/app.exception';

import { IDS } from './ids.constants';
import { IDS_MESSAGES } from './ids.messages';
import { formatControlNumber, formatTin, generateTinBody } from './ids.rules';

import type { TransactionClient } from '../../prisma/prisma.types';
import type { ControlNumberPurpose } from '@prisma/client';

/** Server-side identifier generation (D10); formats and check digits live in ids.rules.ts. */
@Injectable()
export class IdsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Allocates the next sequence row inside the caller's transaction so the number is never reused. */
  async nextControlNumber(tx: TransactionClient, purpose: ControlNumberPurpose): Promise<string> {
    const row = await tx.controlNumber.create({ data: { purpose } });
    return formatControlNumber(row.id);
  }

  /** Random TIN with a uniqueness check; collisions are astronomically rare but handled. */
  async generateTin(): Promise<string> {
    for (let attempt = 0; attempt < IDS.TIN_GENERATE_ATTEMPTS; attempt += 1) {
      const tin = formatTin(generateTinBody(() => randomInt(IDS.DECIMAL_RADIX)));
      if ((await this.prisma.payer.findUnique({ where: { tin }, select: { id: true } })) === null) {
        return tin;
      }
    }
    throw new AppException(
      ErrorCode.INTERNAL_ERROR,
      IDS_MESSAGES.TIN_EXHAUSTED,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
