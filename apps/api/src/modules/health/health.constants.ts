import { join } from 'node:path';

export const HEALTH = {
  LIVENESS_PATH: 'health',
  READINESS_PATH: 'ready',
  CHECK_DB: 'db',
  CHECK_JOBS: 'jobs',
  /** `dist/modules/health` → `apps/api/package.json`; same depth when run from `src` via tsx. */
  PACKAGE_JSON_PATH: join(__dirname, '..', '..', '..', 'package.json'),
  UNKNOWN_VERSION: 'unknown',
} as const;
