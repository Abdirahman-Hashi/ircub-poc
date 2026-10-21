-- CreateEnum
CREATE TYPE "DuplicateMatchField" AS ENUM ('PHONE', 'EMAIL', 'NATIONAL_ID');

-- CreateEnum
CREATE TYPE "DuplicateFlagStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('FIXED', 'PERCENT');

-- CreateTable
CREATE TABLE "payer" (
    "id" UUID NOT NULL,
    "tin" TEXT NOT NULL,
    "type" "PayerType" NOT NULL,
    "name" TEXT NOT NULL,
    "national_id" TEXT,
    "registration_no" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "status" "PayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_flag" (
    "id" UUID NOT NULL,
    "payer_id" UUID NOT NULL,
    "matched_payer_id" UUID NOT NULL,
    "match_field" "DuplicateMatchField" NOT NULL,
    "status" "DuplicateFlagStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_type" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate_type" "RateType" NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "gl_code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment" (
    "id" UUID NOT NULL,
    "control_number" TEXT NOT NULL,
    "payer_id" UUID NOT NULL,
    "revenue_type_id" UUID NOT NULL,
    "period" TEXT,
    "base_amount" DECIMAL(18,2),
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'SOS',
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_by_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "control_number" TEXT NOT NULL,
    "assessment_id" UUID,
    "bill_id" UUID,
    "payer_id" UUID NOT NULL,
    "channel" "PaymentChannel" NOT NULL,
    "channel_txn_ref" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "fx_rate_at" TIMESTAMP(3),
    "local_amount" DECIMAL(18,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "status_check_attempts" INTEGER NOT NULL DEFAULT 0,
    "paid_at" TIMESTAMP(3),
    "captured_by_id" UUID,
    "bulk_upload_id" UUID,
    "callback_payload" JSONB,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reversal" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "captured_by_id" UUID NOT NULL,
    "status" "ReversalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approved_by_id" UUID,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reversal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_upload" (
    "id" UUID NOT NULL,
    "kind" "BulkUploadKind" NOT NULL,
    "file_name" TEXT NOT NULL,
    "stored_path" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "accepted" INTEGER NOT NULL,
    "rejected" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fx_rate" (
    "id" UUID NOT NULL,
    "base" "Currency" NOT NULL,
    "quote" "Currency" NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "as_of" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "fx_rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payer_tin_key" ON "payer"("tin");

-- CreateIndex
CREATE INDEX "payer_name_idx" ON "payer"("name");

-- CreateIndex
CREATE INDEX "payer_phone_idx" ON "payer"("phone");

-- CreateIndex
CREATE INDEX "payer_email_idx" ON "payer"("email");

-- CreateIndex
CREATE INDEX "payer_national_id_idx" ON "payer"("national_id");

-- CreateIndex
CREATE INDEX "payer_status_type_idx" ON "payer"("status", "type");

-- CreateIndex
CREATE INDEX "duplicate_flag_status_idx" ON "duplicate_flag"("status");

-- CreateIndex
CREATE INDEX "duplicate_flag_matched_payer_id_idx" ON "duplicate_flag"("matched_payer_id");

-- CreateIndex
CREATE UNIQUE INDEX "duplicate_flag_payer_id_matched_payer_id_match_field_key" ON "duplicate_flag"("payer_id", "matched_payer_id", "match_field");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_type_code_key" ON "revenue_type"("code");

-- CreateIndex
CREATE INDEX "revenue_type_active_idx" ON "revenue_type"("active");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_control_number_key" ON "assessment"("control_number");

-- CreateIndex
CREATE INDEX "assessment_payer_id_idx" ON "assessment"("payer_id");

-- CreateIndex
CREATE INDEX "assessment_revenue_type_id_idx" ON "assessment"("revenue_type_id");

-- CreateIndex
CREATE INDEX "assessment_status_idx" ON "assessment"("status");

-- CreateIndex
CREATE INDEX "assessment_created_at_idx" ON "assessment"("created_at");

-- CreateIndex
CREATE INDEX "assessment_due_date_idx" ON "assessment"("due_date");

-- CreateIndex
CREATE INDEX "assessment_amount_idx" ON "assessment"("amount");

-- CreateIndex
CREATE INDEX "payment_payer_id_idx" ON "payment"("payer_id");

-- CreateIndex
CREATE INDEX "payment_assessment_id_idx" ON "payment"("assessment_id");

-- CreateIndex
CREATE INDEX "payment_control_number_idx" ON "payment"("control_number");

-- CreateIndex
CREATE INDEX "payment_status_idx" ON "payment"("status");

-- CreateIndex
CREATE INDEX "payment_channel_idx" ON "payment"("channel");

-- CreateIndex
CREATE INDEX "payment_created_at_idx" ON "payment"("created_at");

-- CreateIndex
CREATE INDEX "payment_paid_at_idx" ON "payment"("paid_at");

-- CreateIndex
CREATE INDEX "payment_local_amount_idx" ON "payment"("local_amount");

-- CreateIndex
CREATE UNIQUE INDEX "payment_channel_channel_txn_ref_key" ON "payment"("channel", "channel_txn_ref");

-- CreateIndex
CREATE INDEX "reversal_payment_id_idx" ON "reversal"("payment_id");

-- CreateIndex
CREATE INDEX "reversal_status_idx" ON "reversal"("status");

-- CreateIndex
CREATE INDEX "reversal_captured_by_id_idx" ON "reversal"("captured_by_id");

-- CreateIndex
CREATE INDEX "bulk_upload_kind_created_at_idx" ON "bulk_upload"("kind", "created_at");

-- CreateIndex
CREATE INDEX "fx_rate_base_quote_as_of_idx" ON "fx_rate"("base", "quote", "as_of");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "payer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_flag" ADD CONSTRAINT "duplicate_flag_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "payer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_flag" ADD CONSTRAINT "duplicate_flag_matched_payer_id_fkey" FOREIGN KEY ("matched_payer_id") REFERENCES "payer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "payer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_revenue_type_id_fkey" FOREIGN KEY ("revenue_type_id") REFERENCES "revenue_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "payer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_bulk_upload_id_fkey" FOREIGN KEY ("bulk_upload_id") REFERENCES "bulk_upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reversal" ADD CONSTRAINT "reversal_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_upload" ADD CONSTRAINT "bulk_upload_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
