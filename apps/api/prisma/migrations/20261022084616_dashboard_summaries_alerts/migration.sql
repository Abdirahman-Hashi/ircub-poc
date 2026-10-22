-- CreateTable
CREATE TABLE "daily_collection_summary" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "revenue_type_id" UUID NOT NULL,
    "channel" "PaymentChannel" NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'SOS',
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "count" INTEGER NOT NULL DEFAULT 0,
    "reversed_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reversed_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_collection_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_billing_summary" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "billed_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "collected_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_billing_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_target" (
    "id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "revenue_type_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert" (
    "id" UUID NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_by_id" UUID,
    "acknowledged_at" TIMESTAMP(3),

    CONSTRAINT "alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_collection_summary_date_idx" ON "daily_collection_summary"("date");

-- CreateIndex
CREATE INDEX "daily_collection_summary_revenue_type_id_date_idx" ON "daily_collection_summary"("revenue_type_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_collection_summary_date_revenue_type_id_channel_key" ON "daily_collection_summary"("date", "revenue_type_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "daily_billing_summary_date_key" ON "daily_billing_summary"("date");

-- CreateIndex
CREATE INDEX "revenue_target_period_idx" ON "revenue_target"("period");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_target_period_revenue_type_id_key" ON "revenue_target"("period", "revenue_type_id");

-- CreateIndex
CREATE INDEX "alert_type_created_at_idx" ON "alert"("type", "created_at");

-- CreateIndex
CREATE INDEX "alert_acknowledged_at_idx" ON "alert"("acknowledged_at");

-- AddForeignKey
ALTER TABLE "daily_collection_summary" ADD CONSTRAINT "daily_collection_summary_revenue_type_id_fkey" FOREIGN KEY ("revenue_type_id") REFERENCES "revenue_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_target" ADD CONSTRAINT "revenue_target_revenue_type_id_fkey" FOREIGN KEY ("revenue_type_id") REFERENCES "revenue_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;
