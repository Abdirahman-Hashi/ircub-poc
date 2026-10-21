import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ENV_FILE_PATHS } from './env.constants';
import { validateEnv } from './env.schema';
import { MocksConfigService } from './mocks-config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [...ENV_FILE_PATHS],
      validate: validateEnv,
    }),
  ],
  providers: [MocksConfigService],
  exports: [MocksConfigService],
})
export class MocksConfigModule {}
