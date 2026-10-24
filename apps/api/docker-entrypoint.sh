#!/bin/sh
# Container start: apply migrations, seed once when asked, rotate the demo password when
# one is configured, then serve.
# SEED_ON_BOOT=true runs the seed with --if-incomplete: a database whose seed finished is
# left alone, one whose seed was interrupted is completed (every seeder skips what exists).
# A seed failure is logged but does not stop the api: a demo with partial data beats no demo,
# and the next boot picks the seed up where it stopped.
# SEED_PASSWORD, when set, rewrites the six demo users' password on every boot, so a hosted
# demo never runs with the password printed in the public README.
set -e
./node_modules/.bin/prisma migrate deploy
if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  node dist/seed/prisma/seed.js --if-incomplete || echo "seed: failed, starting the api anyway" >&2
fi
if [ -n "${SEED_PASSWORD:-}" ]; then
  node dist/seed/prisma/seed.js --users-only
fi
exec node dist/main
