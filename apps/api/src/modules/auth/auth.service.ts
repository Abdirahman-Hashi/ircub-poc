import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';

import { ErrorCode, type PermissionCode, UserStatus } from '@ircub/shared';

import { TOKEN_PURPOSE } from '../../common/auth/auth.constants';
import { AppException } from '../../common/errors/app.exception';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { AUTH, AUTH_API } from './auth.constants';
import { AUTH_MESSAGES } from './auth.messages';
import {
  afterFailedLogin,
  afterSuccessfulLogin,
  isLocked,
  isPasswordStale,
} from './password.rules';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';

import type { LoginOutcome, RefreshCookieOptions, SessionOutcome } from './auth.types';
import type { AuthUserResponseDto } from './dto/auth-user.response.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { MeResponseDto } from './dto/me.response.dto';
import type { MfaEnrolResponseDto } from './dto/mfa-enrol.response.dto';
import type { MfaVerifyDto } from './dto/mfa-verify.dto';
import type { SessionResponseDto } from './dto/session.response.dto';
import type { JwtPayload } from '../../common/auth/auth.types';
import type { User } from '@prisma/client';

/**
 * Login, MFA, refresh rotation and password change (D5). Controllers own cookies; this
 * service returns the refresh token to set and never touches the HTTP layer.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly systemConfig: SystemConfigService,
    private readonly permissions: PermissionsService,
    private readonly passwords: PasswordService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async login(dto: LoginDto): Promise<LoginOutcome> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    const now = new Date();
    if (user?.status !== UserStatus.ACTIVE) {
      // Same error as a wrong password so the endpoint cannot be used to enumerate accounts.
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        AUTH_MESSAGES.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (isLocked(user.lockedUntil, now)) {
      throw new AppException(
        ErrorCode.ACCOUNT_LOCKED,
        AUTH_MESSAGES.ACCOUNT_LOCKED,
        HttpStatus.LOCKED,
        {
          lockedUntil: user.lockedUntil,
        },
      );
    }

    const valid = await this.passwords.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.recordFailedLogin(user, now);
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        AUTH_MESSAGES.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (user.failedLoginCount > 0 || user.lockedUntil !== null) {
      await this.prisma.user.update({ where: { id: user.id }, data: afterSuccessfulLogin() });
    }

    if (user.mfaEnabled) {
      const challengeToken = await this.jwt.signAsync(
        this.claims(user, TOKEN_PURPOSE.MFA_CHALLENGE),
        {
          expiresIn: AUTH.MFA_CHALLENGE_TTL_SECONDS,
        },
      );
      this.logger.log({ msg: 'login: mfa challenge issued', userId: user.id });
      return { body: { mfaRequired: true, challengeToken } };
    }
    const session = await this.sessionOutcome(user);
    const { accessToken, user: authUser, permissions } = session.body;
    return {
      body: { mfaRequired: false, accessToken, user: authUser, permissions },
      refreshToken: session.refreshToken,
    };
  }

  async verifyMfa(dto: MfaVerifyDto): Promise<SessionOutcome> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(dto.challengeToken);
    } catch {
      throw new AppException(
        ErrorCode.MFA_INVALID,
        AUTH_MESSAGES.MFA_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (payload.purpose !== TOKEN_PURPOSE.MFA_CHALLENGE) {
      throw new AppException(
        ErrorCode.MFA_INVALID,
        AUTH_MESSAGES.MFA_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
    }
    const user = await this.activeUser(payload.sub);
    if (!user.mfaEnabled || user.mfaSecret === null) {
      throw new AppException(
        ErrorCode.MFA_INVALID,
        AUTH_MESSAGES.MFA_NOT_ENROLLED,
        HttpStatus.UNAUTHORIZED,
      );
    }
    this.assertTotp(user.mfaSecret, dto.code);
    return this.sessionOutcome(user);
  }

  async refresh(cookieToken: string | undefined): Promise<SessionOutcome> {
    if (cookieToken === undefined) {
      throw new AppException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        AUTH_MESSAGES.REFRESH_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
    }
    const stored = await this.refreshTokens.consume(cookieToken);
    const user = await this.activeUser(stored.userId);
    return this.sessionOutcome(user);
  }

  async logout(cookieToken: string | undefined): Promise<void> {
    if (cookieToken !== undefined) {
      await this.refreshTokens.revoke(cookieToken);
    }
  }

  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: { select: { id: true, code: true, name: true } } } } },
    });
    const permissions = await this.permissions.getEffectivePermissions(userId);
    return {
      user: await this.toAuthUser(user),
      roles: user.roles.map((membership) => membership.role),
      permissions: [...permissions],
    };
  }

  async enrolMfa(userId: string): Promise<MfaEnrolResponseDto> {
    const user = await this.activeUser(userId);
    if (user.mfaEnabled) {
      throw new AppException(
        ErrorCode.CONFLICT,
        AUTH_MESSAGES.MFA_ALREADY_ENABLED,
        HttpStatus.CONFLICT,
      );
    }
    const secret = authenticator.generateSecret();
    // Stored now but inactive until the user proves their app with a code (confirmMfa).
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    const otpauthUrl = authenticator.keyuri(user.email, AUTH.TOTP_ISSUER, secret);
    return { otpauthUrl, secret };
  }

  async confirmMfa(userId: string, code: string): Promise<void> {
    const user = await this.activeUser(userId);
    if (user.mfaSecret === null) {
      throw new AppException(
        ErrorCode.MFA_INVALID,
        AUTH_MESSAGES.MFA_NOT_ENROLLED,
        HttpStatus.BAD_REQUEST,
      );
    }
    this.assertTotp(user.mfaSecret, code);
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    this.logger.log({ msg: 'mfa enabled', userId });
  }

  async disableMfa(userId: string, password: string): Promise<void> {
    const user = await this.activeUser(userId);
    if (!(await this.passwords.verify(user.passwordHash, password))) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        AUTH_MESSAGES.CURRENT_PASSWORD_WRONG,
        HttpStatus.UNAUTHORIZED,
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    this.logger.log({ msg: 'mfa disabled', userId });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentRefreshToken: string | undefined,
  ): Promise<void> {
    const user = await this.activeUser(userId);
    if (!(await this.passwords.verify(user.passwordHash, dto.currentPassword))) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        AUTH_MESSAGES.CURRENT_PASSWORD_WRONG,
        HttpStatus.UNAUTHORIZED,
      );
    }
    await this.passwords.assertPolicy(dto.newPassword);
    await this.passwords.assertNotReused(userId, dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await this.passwords.setPassword(tx, userId, dto.newPassword);
    });
    await this.refreshTokens.revokeAllExcept(userId, currentRefreshToken);
    this.logger.log({ msg: 'password changed', userId });
  }

  refreshCookieOptions(): RefreshCookieOptions {
    return {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: AUTH_API.SAME_SITE,
      path: AUTH_API.COOKIE_PATH,
      maxAge: this.config.jwtRefreshTtlSeconds * AUTH.MS_PER_SECOND,
    };
  }

  private async sessionOutcome(user: User): Promise<SessionOutcome> {
    const [accessToken, refreshToken, permissions, authUser] = await Promise.all([
      this.jwt.signAsync(this.claims(user, TOKEN_PURPOSE.ACCESS)),
      this.refreshTokens.issue(user.id),
      this.permissions.getEffectivePermissions(user.id),
      this.toAuthUser(user),
    ]);
    const body: SessionResponseDto = {
      accessToken,
      user: authUser,
      permissions: [...permissions] as PermissionCode[],
    };
    return { body, refreshToken };
  }

  private claims(user: User, purpose: JwtPayload['purpose']): JwtPayload {
    return { sub: user.id, email: user.email, purpose };
  }

  private async activeUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.status !== UserStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        AUTH_MESSAGES.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }
    return user;
  }

  private assertTotp(secret: string, code: string): void {
    if (!authenticator.verify({ token: code, secret })) {
      throw new AppException(
        ErrorCode.MFA_INVALID,
        AUTH_MESSAGES.MFA_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private async recordFailedLogin(user: User, now: Date): Promise<void> {
    const [maxFailedAttempts, lockoutMinutes] = await Promise.all([
      this.systemConfig.get(SystemConfigKey.LOGIN_MAX_FAILED_ATTEMPTS),
      this.systemConfig.get(SystemConfigKey.LOGIN_LOCKOUT_MINUTES),
    ]);
    const next = afterFailedLogin(user, { maxFailedAttempts, lockoutMinutes }, now);
    await this.prisma.user.update({ where: { id: user.id }, data: next });
    if (next.lockedUntil !== null && next.lockedUntil !== user.lockedUntil) {
      this.logger.warn({
        msg: 'account locked after failed logins',
        userId: user.id,
        lockedUntil: next.lockedUntil,
      });
    }
  }

  private async toAuthUser(user: User): Promise<AuthUserResponseDto> {
    const maxAgeDays = await this.systemConfig.get(SystemConfigKey.PASSWORD_MAX_AGE_DAYS);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      mfaEnabled: user.mfaEnabled,
      passwordChangeRecommended: isPasswordStale(user.passwordChangedAt, maxAgeDays, new Date()),
    };
  }
}
