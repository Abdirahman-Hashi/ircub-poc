/**
 * Times the dashboard trends endpoint against a running API (phase 6 performance check):
 *   API_URL=http://localhost:3000 pnpm --filter api bench
 * Logs in as the seeded supervisor, warms the endpoint once, then reports p50/p95 of
 * `GET /dashboard/trends` for the last 12 months grouped by day.
 */
import { subMonths } from 'date-fns';

import { SEED_PASSWORD } from '../prisma/seed/seed.constants';

const BENCH = {
  DEFAULT_API_URL: 'http://localhost:3000',
  USER: 'supervisor@ircub.test',
  RUNS: 20,
  MONTHS: 12,
  P50: 0.5,
  P95: 0.95,
  DATE_LENGTH: 'YYYY-MM-DD'.length,
} as const;

function quantile(sorted: readonly number[], q: number): number {
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[index] ?? 0;
}

async function main(): Promise<void> {
  const apiUrl = process.env.API_URL ?? BENCH.DEFAULT_API_URL;
  const login = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: BENCH.USER, password: SEED_PASSWORD }),
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const to = new Date().toISOString().slice(0, BENCH.DATE_LENGTH);
  const from = subMonths(new Date(), BENCH.MONTHS).toISOString().slice(0, BENCH.DATE_LENGTH);
  const url = `${apiUrl}/dashboard/trends?from=${from}&to=${to}&groupBy=day&by=revenueType`;
  const headers = { authorization: `Bearer ${accessToken}` };
  await fetch(url, { headers });
  const timings: number[] = [];
  for (let i = 0; i < BENCH.RUNS; i += 1) {
    const started = performance.now();
    const response = await fetch(url, { headers });
    await response.json();
    timings.push(performance.now() - started);
  }
  timings.sort((a, b) => a - b);
  console.info(
    `trends ${BENCH.MONTHS} months × ${BENCH.RUNS} runs: p50 ${quantile(timings, BENCH.P50).toFixed(1)} ms, p95 ${quantile(timings, BENCH.P95).toFixed(1)} ms, max ${(timings[timings.length - 1] ?? 0).toFixed(1)} ms`,
  );
}

main().catch((error: unknown) => {
  console.error('bench failed', error);
  process.exit(1);
});
