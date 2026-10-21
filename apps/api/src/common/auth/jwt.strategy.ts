import { HttpStatus, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ErrorCode, UserStatus } from '@ircub/shared';

import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../context/request-context.storage';
import { AppException } from '../errors/app.exception';

import { JWT_STRATEGY_NAME, TOKEN_PURPOSE } from './auth.constants';
import { AUTH_MESSAGES } from './auth.messages';

import type { AuthenticatedUser, JwtPayload } from './auth.types';

/**
 * Validates the bearer access token and resolves it to an active user. Also records the
 * actor in the request context so the audit extension and logs can attribute the request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY_NAME) {
  constructor(
    config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.purpose !== TOKEN_PURPOSE.ACCESS) {
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        AUTH_MESSAGES.TOKEN_WRONG_PURPOSE,
        HttpStatus.UNAUTHORIZED,
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, status: true },
    });
    if (user?.status !== UserStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        AUTH_MESSAGES.USER_NOT_ACTIVE,
        HttpStatus.UNAUTHORIZED,
      );
    }
    const context = getRequestContext();
    if (context !== undefined) {
      context.actorId = user.id;
      context.actorEmail = user.email;
    }
    return { id: user.id, email: user.email };
  }
}
