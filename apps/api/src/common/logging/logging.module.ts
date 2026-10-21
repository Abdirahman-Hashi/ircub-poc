import { randomUUID } from 'node:crypto';

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { API } from '@ircub/shared';

import { AppConfigService } from '../../config/app-config.service';

import { LOG_IGNORED_PATHS, LOG_REDACT_PATHS, PINO_PRETTY_TARGET } from './logging.constants';

import type { IncomingMessage } from 'node:http';

function readRequestId(req: IncomingMessage): string {
  const header = req.headers[API.REQUEST_ID_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  return value ?? randomUUID();
}

/**
 * Structured logging (standards §4): JSON lines in production, pretty-printed in
 * development. Nest's `Logger` is routed through pino (see main.ts `app.useLogger`), so
 * every `new Logger(Context.name)` call site gets module, requestId and level for free.
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.logLevel,
          genReqId: readRequestId,
          redact: [...LOG_REDACT_PATHS],
          autoLogging: {
            ignore: (req) => LOG_IGNORED_PATHS.some((path) => req.url?.startsWith(path) === true),
          },
          customProps: (req) => ({ requestId: readRequestId(req) }),
          ...(config.isProduction
            ? {}
            : { transport: { target: PINO_PRETTY_TARGET, options: { singleLine: true } } }),
        },
      }),
    }),
  ],
})
export class LoggingModule {}
