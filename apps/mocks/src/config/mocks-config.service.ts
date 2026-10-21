import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { MocksEnv } from './env.schema';

@Injectable()
export class MocksConfigService {
  constructor(private readonly config: ConfigService<MocksEnv, true>) {}

  get port(): number {
    return this.config.get('MOCKS_PORT', { infer: true });
  }

  get isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  get logLevel(): string {
    return this.config.get('LOG_LEVEL', { infer: true });
  }

  get sharedSecret(): string {
    return this.config.get('MOCK_SHARED_SECRET', { infer: true });
  }

  get callbackDelayMs(): number {
    return this.config.get('MOCK_CALLBACK_DELAY_MS', { infer: true });
  }
}
