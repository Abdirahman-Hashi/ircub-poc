import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Single .env at the repository root; Vite only exposes VITE_* variables to the bundle.
  envDir: repoRoot,
  resolve: {
    // Source alias so shared changes hot-reload without a build step.
    alias: { '@ircub/shared': `${repoRoot}packages/shared/src/index.ts` },
  },
  server: { port: 5173, host: true },
  preview: { port: 5173 },
  build: { outDir: `${here}dist`, sourcemap: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}'],
  },
});
