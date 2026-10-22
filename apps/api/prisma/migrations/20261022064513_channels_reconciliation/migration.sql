-- CreateEnum
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "channel_request_payload" JSONB,
ADD COLUMN     "last_status_check_at" TIMESTAMP(3),
ADD COLUMN     "permanently_failed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "channel_statement" (
    "id" UUID NOT NULL,
    "channel" "PaymentChannel" NOT NULL,
    "statement_date" DATE NOT NULL,
    "file_name" TEXT NOT NULL,
    "stored_path" TEXT NOT NULL,
    "line_count" INTEGER NOT NULL,
    "imported_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_statement_line" (
    "id" UUID NOT NULL,
    "statement_id" UUID NOT NULL,
    "txn_ref" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "control_number" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "channel_statement_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_run" (
    "id" UUID NOT NULL,
    "channel" "PaymentChannel" NOT NULL,
    "run_date" DATE NOT NULL,
    "statement_id" UUID,
    "status" "ReconciliationRunStatus" NOT NULL DEFAULT 'COMPLETED',
    "matched" INTEGER NOT NULL DEFAULT 0,
    "missing_in_ircub" INTEGER NOT NULL DEFAULT 0,
    "missing_in_channel" INTEGER NOT NULL DEFAULT 0,
    "amount_mismatch" INTEGER NOT NULL DEFAULT 0,
    "run_by_id" UUID,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_line" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "status" "ReconciliationLineStatus" NOT NULL,
    "txn_ref" TEXT NOT NULL,
    "payment_id" UUID,
    "statement_line_id" UUID,
    "ircub_amount" DECIMAL(18,2),
    "channel_amount" DECIMAL(18,2),
    "note" TEXT,

    CONSTRAINT "reconciliation_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "channel_statement_channel_statement_date_idx" ON "channel_statement"("channel", "statement_date");

-- CreateIndex
CREATE INDEX "channel_statement_line_statement_id_idx" ON "channel_statement_line"("statement_id");

-- CreateIndex
CREATE INDEX "channel_statement_line_txn_ref_idx" ON "channel_statement_line"("txn_ref");

-- CreateIndex
CREATE INDEX "reconciliation_run_channel_run_date_idx" ON "reconciliation_run"("channel", "run_date");

-- CreateIndex
CREATE INDEX "reconciliation_line_run_id_status_idx" ON "reconciliation_line"("run_id", "status");

-- AddForeignKey
ALTER TABLE "channel_statement_line" ADD CONSTRAINT "channel_statement_line_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "channel_statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_run" ADD CONSTRAINT "reconciliation_run_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "channel_statement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_line" ADD CONSTRAINT "reconciliation_line_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "reconciliation_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_line" ADD CONSTRAINT "reconciliation_line_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_line" ADD CONSTRAINT "reconciliation_line_statement_line_id_fkey" FOREIGN KEY ("statement_line_id") REFERENCES "channel_statement_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;
