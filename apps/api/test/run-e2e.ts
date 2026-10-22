import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse } from 'dotenv';

import { TEST_ENV } from './test-env.constants';

/**
 * Runs the e2e suite against the throwaway test database: applies migrations, then Jest.
 * Exists so `pnpm --filter api test:e2e` behaves identically on a laptop
 * (docker-compose.test.yml) and in CI (postgres service container).
 *
 * The test database is chosen in this order, so a developer's DATABASE_URL (the dev
 * database) is never migrated or seeded by the suite:
 *   TEST_DATABASE_URL (shell) → TEST_DATABASE_URL (root .env) → the docker-compose.test default.
 */
const ROOT_ENV_FILE = resolve(__dirname, '..', '..', '..', '.env');

function readRootEnvValue(key: string): string | undefined {
  if (!existsSync(ROOT_ENV_FILE)) {
    return undefined;
  }
  return parse(readFileSync(ROOT_ENV_FILE))[key];
}

const databaseUrl =
  process.env.TEST_DATABASE_URL ?? readRootEnvValue('TEST_DATABASE_URL') ?? TEST_ENV.DATABASE_URL;

const env: NodeJS.ProcessEnv = { ...TEST_ENV, ...process.env, DATABASE_URL: databaseUrl };

function run(command: string, args: readonly string[]): void {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.info(`e2e: using ${databaseUrl.replace(/:\/\/.*@/, '://***@')}`);
run('pnpm', ['exec', 'prisma', 'migrate', 'deploy']);
run('pnpm', ['exec', 'prisma', 'db', 'seed']);
run('pnpm', [
  'exec',
  'jest',
  '--config',
  'test/jest-e2e.json',
  '--runInBand',
  ...process.argv.slice(2),
]);
