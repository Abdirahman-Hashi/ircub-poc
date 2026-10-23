#!/bin/sh
# Container start: apply migrations, seed once when asked, rotate the demo password when
# one is configured, then serve.
# SEED_ON_BOOT=true runs the seed with --if-empty: a database that already has users is
# left alone, so restarts and redeploys never regenerate the demo data.
# SEED_PASSWORD, when set, rewrites the six demo users' password on every boot, so a hosted
# demo never runs with the password printed in the public README.
set -e
./node_modules/.bin/prisma migrate deploy
if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  node dist/seed/prisma/seed.js --if-empty
fi
if [ -n "${SEED_PASSWORD:-}" ]; then
  node dist/seed/prisma/seed.js --users-only
fi
exec node dist/main
