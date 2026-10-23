import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { MocksConfigService } from './config/mocks-config.service';
import { MOCKS_APP } from './mocks.constants';

import type { Response } from 'express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const swagger = new DocumentBuilder()
    .setTitle(MOCKS_APP.NAME)
    .setDescription(MOCKS_APP.DESCRIPTION)
    .setContact(MOCKS_APP.AUTHOR, '', '')
    .build();
  SwaggerModule.setup(MOCKS_APP.SWAGGER_PATH, app, SwaggerModule.createDocument(app, swagger));
  app.getHttpAdapter().get(MOCKS_APP.ROOT_PATH, (_request, response: Response) => {
    response.redirect(`/${MOCKS_APP.SWAGGER_PATH}`);
  });

  const config = app.get(MocksConfigService);
  await app.listen(config.port);
  new Logger('bootstrap').log({ msg: 'mocks listening', port: config.port });
}

bootstrap().catch((error: unknown) => {
  console.error('mocks failed to start', error);
  process.exit(1);
});
