-- Promote the de-duplication key out of the JSON payload so the database, not a
-- find-then-create, guarantees one open alert per (type, key).
ALTER TABLE "alert" ADD COLUMN "dedupe_key" TEXT;
UPDATE "alert" SET "dedupe_key" = COALESCE("data"->>'dedupeKey', "id"::text);
ALTER TABLE "alert" ALTER COLUMN "dedupe_key" SET NOT NULL;

-- One open (unacknowledged) alert per type and key; acknowledged ones may repeat.
CREATE UNIQUE INDEX "alert_open_dedupe_key" ON "alert"("type", "dedupe_key") WHERE "acknowledged_at" IS NULL;
