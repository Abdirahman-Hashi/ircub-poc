#!/bin/sh
# Container start: apply migrations, seed once when asked, then serve.
# SEED_ON_BOOT=true runs the seed with --if-empty: a database that already has users is
# left alone, so restarts and redeploys never regenerate the demo data.
set -e
./node_modules/.bin/prisma migrate deploy
if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  node dist/seed/prisma/seed.js --if-empty
fi
exec node dist/main
