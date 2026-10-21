import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { API } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';

import { AUTH_API, AUTH_THROTTLE } from './auth.constants';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { MeResponseDto } from './dto/me.response.dto';
import { MfaCodeDto } from './dto/mfa-code.dto';
import { MfaDisableDto } from './dto/mfa-disable.dto';
import { MfaEnrolResponseDto } from './dto/mfa-enrol.response.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { SessionResponseDto } from './dto/session.response.dto';

import type { IssuedRefreshToken } from './auth.types';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import type { Request, Response } from 'express';

function readRefreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[API.REFRESH_COOKIE];
}

@ApiTags('auth')
@Controller(AUTH_API.PATH)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: AUTH_THROTTLE.LOGIN })
  @Post(AUTH_API.LOGIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Password login; returns an MFA challenge when enabled' })
  @ApiResponse({ status: HttpStatus.OK, type: LoginResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: HttpStatus.LOCKED, description: 'ACCOUNT_LOCKED' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const outcome = await this.auth.login(dto);
    this.setRefreshCookie(res, outcome.refreshToken);
    return outcome.body;
  }

  @Public()
  @Throttle({ default: AUTH_THROTTLE.LOGIN })
  @Post(AUTH_API.MFA_VERIFY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with a TOTP code' })
  @ApiResponse({ status: HttpStatus.OK, type: SessionResponseDto })
  async verifyMfa(
    @Body() dto: MfaVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponseDto> {
    const outcome = await this.auth.verifyMfa(dto);
    this.setRefreshCookie(res, outcome.refreshToken);
    return outcome.body;
  }

  @Public()
  @Throttle({ default: AUTH_THROTTLE.REFRESH })
  @Post(AUTH_API.REFRESH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh cookie and issue a new access token' })
  @ApiResponse({ status: HttpStatus.OK, type: SessionResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponseDto> {
    const outcome = await this.auth.refresh(readRefreshCookie(req));
    this.setRefreshCookie(res, outcome.refreshToken);
    return outcome.body;
  }

  @Public()
  @Post(AUTH_API.LOGOUT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the refresh token and clear the cookie' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readRefreshCookie(req));
    res.clearCookie(API.REFRESH_COOKIE, { path: AUTH_API.COOKIE_PATH });
  }

  @Get(AUTH_API.ME)
  @ApiBearerAuth(SWAGGER.BEARER_SCHEME)
  @ApiOperation({ summary: 'Current user, roles and effective permissions' })
  @ApiResponse({ status: HttpStatus.OK, type: MeResponseDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    return this.auth.me(user.id);
  }

  @Post(AUTH_API.MFA_ENROL)
  @ApiBearerAuth(SWAGGER.BEARER_SCHEME)
  @ApiOperation({ summary: 'Start TOTP enrolment; returns the otpauth URL to scan' })
  @ApiResponse({ status: HttpStatus.CREATED, type: MfaEnrolResponseDto })
  enrolMfa(@CurrentUser() user: AuthenticatedUser): Promise<MfaEnrolResponseDto> {
    return this.auth.enrolMfa(user.id);
  }

  @Post(AUTH_API.MFA_CONFIRM)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SWAGGER.BEARER_SCHEME)
  @ApiOperation({ summary: 'Confirm enrolment with a code from the authenticator app' })
  confirmMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaCodeDto): Promise<void> {
    return this.auth.confirmMfa(user.id, dto.code);
  }

  @Post(AUTH_API.MFA_DISABLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SWAGGER.BEARER_SCHEME)
  @ApiOperation({ summary: 'Disable TOTP after re-entering the password' })
  disableMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaDisableDto): Promise<void> {
    return this.auth.disableMfa(user.id, dto.password);
  }

  @Post(AUTH_API.CHANGE_PASSWORD)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SWAGGER.BEARER_SCHEME)
  @ApiOperation({
    summary: 'Change password (policy + history enforced); other sessions are revoked',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'PASSWORD_POLICY_VIOLATION | PASSWORD_REUSED',
  })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    return this.auth.changePassword(user.id, dto, readRefreshCookie(req));
  }

  private setRefreshCookie(res: Response, token: IssuedRefreshToken | undefined): void {
    if (token !== undefined) {
      res.cookie(API.REFRESH_COOKIE, token.token, this.auth.refreshCookieOptions());
    }
  }
}
