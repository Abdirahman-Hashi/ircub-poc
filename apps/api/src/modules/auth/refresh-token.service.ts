import { createHash, randomBytes } from 'node:crypto';

import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';

import { AUTH } from './auth.constants';
import { AUTH_MESSAGES } from './auth.messages';

import type { IssuedRefreshToken } from './auth.types';
import type { RefreshToken } from '@prisma/client';

/**
 * Opaque refresh tokens (D5): random bytes, stored only as a sha256 hash, rotated on every
 * use. Presenting an already-rotated token is treated as theft: every session of that user
 * is revoked (reuse detection). Tokens revoked by logout simply fail as invalid.
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async issue(userId: string): Promise<IssuedRefreshToken> {
    const token = randomBytes(AUTH.REFRESH_TOKEN_BYTES).toString(AUTH.REFRESH_TOKEN_ENCODING);
    const tokenHash = RefreshTokenService.hash(token);
    const expiresAt = new Date(Date.now() + this.config.jwtRefreshTtlSeconds * AUTH.MS_PER_SECOND);
    await this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
    return { token, tokenHash, expiresAt };
  }

  /** Validates and revokes the presented token; the caller issues a replacement. */
  async consume(token: string): Promise<RefreshToken> {
    const tokenHash = RefreshTokenService.hash(token);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (stored === null) {
      throw new AppException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        AUTH_MESSAGES.REFRESH_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (stored.rotatedAt !== null) {
      // The token was already exchanged once: someone replayed it. Kill every session.
      this.logger.warn({
        msg: 'refresh token reuse detected; revoking all sessions',
        userId: stored.userId,
      });
      await this.revokeAll(stored.userId);
      throw new AppException(
        ErrorCode.REFRESH_TOKEN_REUSED,
        AUTH_MESSAGES.REFRESH_REUSED,
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (stored.revokedAt !== null || stored.expiresAt.getTime() <= Date.now()) {
      throw new AppException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        AUTH_MESSAGES.REFRESH_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
    }
    const now = new Date();
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { rotatedAt: now, revokedAt: now },
    });
    return stored;
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: RefreshTokenService.hash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Used after a password change: keep the session that made the change, drop the rest. */
  async revokeAllExcept(userId: string, keepToken: string | undefined): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepToken === undefined
          ? {}
          : { tokenHash: { not: RefreshTokenService.hash(keepToken) } }),
      },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  static hash(token: string): string {
    return createHash(AUTH.REFRESH_TOKEN_HASH_ALGORITHM).update(token).digest('hex');
  }
}
