import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';

import { SWAGGER } from './app.constants';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './app.setup';

/**
 * `pnpm --filter api openapi:export` — builds, then instantiates the module graph (no
 * `init()`, so no database or queue connection is opened), writes docs/openapi.json and exits.
 * Runs from `dist` because decorator metadata (needed for DI) is only emitted by tsc.
 */
async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  const document = buildOpenApiDocument(app);
  const target = resolve(process.cwd(), SWAGGER.EXPORT_PATH);
  writeFileSync(target, `${JSON.stringify(document, null, SWAGGER.EXPORT_INDENT)}\n`);
  await app.close();
  console.info(`openapi written to ${target}`);
}

exportOpenApi().catch((error: unknown) => {
  console.error('openapi export failed', error);
  process.exit(1);
});
