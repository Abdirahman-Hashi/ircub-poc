-- CreateTable
CREATE TABLE "gl_mapping" (
    "id" UUID NOT NULL,
    "revenue_type_id" UUID NOT NULL,
    "gl_code" TEXT NOT NULL,
    "gl_name" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gl_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_batch" (
    "id" UUID NOT NULL,
    "batch_date" DATE NOT NULL,
    "kind" "JournalBatchKind" NOT NULL,
    "status" "JournalBatchStatus" NOT NULL DEFAULT 'PENDING',
    "line_count" INTEGER NOT NULL DEFAULT 0,
    "total_local" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fmis_reference" TEXT,
    "posted_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "reversed_by_batch_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_line" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "payment_id" UUID,
    "reversal_id" UUID,
    "revenue_type_id" UUID NOT NULL,
    "gl_code" TEXT NOT NULL,
    "debit_gl" TEXT NOT NULL,
    "credit_gl" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'SOS',
    "reference" TEXT NOT NULL,
    "reversed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gl_mapping_revenue_type_id_effective_from_idx" ON "gl_mapping"("revenue_type_id", "effective_from" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "gl_mapping_revenue_type_id_effective_from_key" ON "gl_mapping"("revenue_type_id", "effective_from");

-- CreateIndex
CREATE INDEX "journal_batch_batch_date_kind_idx" ON "journal_batch"("batch_date", "kind");

-- CreateIndex
CREATE INDEX "journal_batch_status_idx" ON "journal_batch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "journal_line_payment_id_key" ON "journal_line"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_line_reversal_id_key" ON "journal_line"("reversal_id");

-- CreateIndex
CREATE INDEX "journal_line_batch_id_idx" ON "journal_line"("batch_id");

-- CreateIndex
CREATE INDEX "journal_line_gl_code_idx" ON "journal_line"("gl_code");

-- AddForeignKey
ALTER TABLE "gl_mapping" ADD CONSTRAINT "gl_mapping_revenue_type_id_fkey" FOREIGN KEY ("revenue_type_id") REFERENCES "revenue_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_batch" ADD CONSTRAINT "journal_batch_reversed_by_batch_id_fkey" FOREIGN KEY ("reversed_by_batch_id") REFERENCES "journal_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "journal_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_reversal_id_fkey" FOREIGN KEY ("reversal_id") REFERENCES "reversal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_revenue_type_id_fkey" FOREIGN KEY ("revenue_type_id") REFERENCES "revenue_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One COLLECTIONS batch per day; REVERSAL batches may repeat (one per approved reversal).
CREATE UNIQUE INDEX "journal_batch_collections_date_key" ON "journal_batch"("batch_date") WHERE "kind" = 'COLLECTIONS';
