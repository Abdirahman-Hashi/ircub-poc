import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env, LogLevel, NodeEnv } from './env.schema';

/**
 * Typed facade over the validated environment. Services inject this instead of
 * `ConfigService` so every setting has one name, one type and one place to change.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get nodeEnv(): NodeEnv {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get logLevel(): LogLevel {
    return this.config.get('LOG_LEVEL', { infer: true });
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get jwtSecret(): string {
    return this.config.get('JWT_SECRET', { infer: true });
  }

  get jwtRefreshSecret(): string {
    return this.config.get('JWT_REFRESH_SECRET', { infer: true });
  }

  get jwtAccessTtlSeconds(): number {
    return this.config.get('JWT_ACCESS_TTL', { infer: true });
  }

  get jwtRefreshTtlSeconds(): number {
    return this.config.get('JWT_REFRESH_TTL', { infer: true });
  }

  get mocksBaseUrl(): string {
    return this.config.get('MOCKS_BASE_URL', { infer: true });
  }

  get mockSharedSecret(): string {
    return this.config.get('MOCK_SHARED_SECRET', { infer: true });
  }

  get apiPublicUrl(): string {
    return this.config.get('API_PUBLIC_URL', { infer: true });
  }

  get corsOrigins(): readonly string[] {
    return this.config.get('CORS_ORIGIN', { infer: true });
  }

  get storageDir(): string {
    return this.config.get('STORAGE_DIR', { infer: true });
  }
}
