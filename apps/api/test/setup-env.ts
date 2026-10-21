import { TEST_ENV } from './test-env.constants';

// Fill in any variable the developer or CI has not provided, so the suite boots the same
// way everywhere. Explicitly set values always win.
for (const [key, value] of Object.entries(TEST_ENV)) {
  process.env[key] ??= value;
}
