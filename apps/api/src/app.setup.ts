import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { API } from '@ircub/shared';

import { APP, SWAGGER, VALIDATION_PIPE_OPTIONS } from './app.constants';
import { requestIdMiddleware } from './common/context/request-id.middleware';
import { AppConfigService } from './config/app-config.service';

/**
 * Everything `main.ts`, the OpenAPI export and the e2e tests must apply identically.
 * Keeping it in one function is what makes the e2e suite exercise the real middleware stack.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(AppConfigService);

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  // Must be first so the HTTP logger and every handler see the request id.
  app.use(requestIdMiddleware);
  // The API serves JSON only; CSP targets HTML documents and would only break Swagger UI.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.enableCors({
    origin: [...config.corsOrigins],
    credentials: true,
    exposedHeaders: [API.REQUEST_ID_HEADER],
  });
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const builder = new DocumentBuilder()
    .setTitle(APP.NAME)
    .setDescription(APP.DESCRIPTION)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, SWAGGER.BEARER_SCHEME)
    .build();
  return SwaggerModule.createDocument(app, builder);
}

export function mountSwagger(app: INestApplication): void {
  SwaggerModule.setup(SWAGGER.PATH, app, buildOpenApiDocument(app));
}
