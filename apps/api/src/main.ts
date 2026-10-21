import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApp, mountSwagger } from './app.setup';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApp(app);
  mountSwagger(app);

  const config = app.get(AppConfigService);
  await app.listen(config.port);
  new Logger('bootstrap').log({ msg: 'api listening', port: config.port, env: config.nodeEnv });
}

bootstrap().catch((error: unknown) => {
  // Logger may not be wired yet (env validation failed), so fall back to the console.
  console.error('api failed to start', error);
  process.exit(1);
});
