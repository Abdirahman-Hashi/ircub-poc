import { randomInt } from 'node:crypto';

import { HttpStatus, Injectable } from '@nestjs/common';
import { argon2id, hash as argon2Hash, verify as argon2Verify } from 'argon2';

import { ErrorCode } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { AUTH } from './auth.constants';
import { AUTH_MESSAGES } from './auth.messages';
import { generateTemporaryPassword, validatePasswordPolicy } from './password.rules';

import type { TransactionClient } from '../../prisma/prisma.types';

/**
 * Hashing (argon2id), policy and history checks (D5). Shared by the auth flow and the
 * users admin module so "set a password" has exactly one implementation.
 */
@Injectable()
export class PasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  hash(password: string): Promise<string> {
    return argon2Hash(password, { type: argon2id });
  }

  verify(hash: string, password: string): Promise<boolean> {
    return argon2Verify(hash, password);
  }

  generateTemporary(): string {
    return generateTemporaryPassword(AUTH.TEMP_PASSWORD_RANDOM_LENGTH, (max) => randomInt(max));
  }

  /** Throws PASSWORD_POLICY_VIOLATION with the list of broken rules. */
  async assertPolicy(password: string): Promise<void> {
    const minLength = await this.systemConfig.get(SystemConfigKey.PASSWORD_MIN_LENGTH);
    const violations = validatePasswordPolicy(password, { minLength });
    if (violations.length > 0) {
      throw new AppException(
        ErrorCode.PASSWORD_POLICY_VIOLATION,
        AUTH_MESSAGES.PASSWORD_POLICY,
        HttpStatus.UNPROCESSABLE_ENTITY,
        { violations, minLength },
      );
    }
  }

  /** Throws PASSWORD_REUSED if the password matches any of the last N hashes. */
  async assertNotReused(userId: string, password: string): Promise<void> {
    const historySize = await this.systemConfig.get(SystemConfigKey.PASSWORD_HISTORY_SIZE);
    const history = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: historySize,
    });
    for (const entry of history) {
      if (await this.verify(entry.passwordHash, password)) {
        throw new AppException(
          ErrorCode.PASSWORD_REUSED,
          AUTH_MESSAGES.PASSWORD_REUSED,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }
  }

  /**
   * Writes a new hash, records it in history and trims history to the configured size.
   * Runs inside the caller's transaction.
   */
  async setPassword(tx: TransactionClient, userId: string, password: string): Promise<void> {
    const historySize = await this.systemConfig.get(SystemConfigKey.PASSWORD_HISTORY_SIZE);
    const passwordHash = await this.hash(password);
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    await tx.passwordHistory.create({ data: { userId, passwordHash } });
    const stale = await tx.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: historySize,
      select: { id: true },
    });
    if (stale.length > 0) {
      await tx.passwordHistory.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } });
    }
  }
}
