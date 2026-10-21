-- CreateTable
CREATE TABLE "tariff_category" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fixed_charge" DECIMAL(18,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariff_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_tier" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "from_unit" INTEGER NOT NULL,
    "to_unit" INTEGER,
    "rate_per_unit" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "tariff_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_account" (
    "id" UUID NOT NULL,
    "account_number" TEXT NOT NULL,
    "payer_id" UUID NOT NULL,
    "tariff_category_id" UUID NOT NULL,
    "service_address" TEXT NOT NULL,
    "status" "WaterAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter" (
    "id" UUID NOT NULL,
    "serial" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "max_digits" INTEGER NOT NULL DEFAULT 6,
    "initial_reading" INTEGER NOT NULL DEFAULT 0,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MeterStatus" NOT NULL DEFAULT 'ACTIVE',
    "replaces_meter_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_reading" (
    "id" UUID NOT NULL,
    "meter_id" UUID NOT NULL,
    "reading_date" DATE NOT NULL,
    "reading_value" INTEGER NOT NULL,
    "type" "ReadingType" NOT NULL DEFAULT 'NORMAL',
    "consumption" INTEGER NOT NULL,
    "source" "ReadingSource" NOT NULL DEFAULT 'MANUAL',
    "captured_by_id" UUID NOT NULL,
    "bulk_upload_id" UUID,
    "abnormal" BOOLEAN NOT NULL DEFAULT false,
    "abnormal_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_cycle" (
    "id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "status" "BillingCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "run_by_id" UUID NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_by_id" UUID,
    "released_at" TIMESTAMP(3),
    "stats" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill" (
    "id" UUID NOT NULL,
    "bill_number" TEXT NOT NULL,
    "cycle_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "payer_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "previous_reading" INTEGER NOT NULL,
    "current_reading" INTEGER NOT NULL,
    "consumption" INTEGER NOT NULL,
    "tier_breakdown" JSONB NOT NULL,
    "consumption_charge" DECIMAL(18,2) NOT NULL,
    "fixed_charge" DECIMAL(18,2) NOT NULL,
    "arrears" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "payments_applied" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_due" DECIMAL(18,2) NOT NULL,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'SOS',
    "status" "BillStatus" NOT NULL DEFAULT 'DRAFT',
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flag_reason" TEXT,
    "flag_note" TEXT,
    "pdf_path" TEXT,
    "due_date" DATE NOT NULL,
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "related_type" TEXT,
    "related_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tariff_category_code_key" ON "tariff_category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_tier_category_id_from_unit_key" ON "tariff_tier"("category_id", "from_unit");

-- CreateIndex
CREATE UNIQUE INDEX "water_account_account_number_key" ON "water_account"("account_number");

-- CreateIndex
CREATE INDEX "water_account_payer_id_idx" ON "water_account"("payer_id");

-- CreateIndex
CREATE INDEX "water_account_status_idx" ON "water_account"("status");

-- CreateIndex
CREATE UNIQUE INDEX "meter_serial_key" ON "meter"("serial");

-- CreateIndex
CREATE INDEX "meter_account_id_idx" ON "meter"("account_id");

-- CreateIndex
CREATE INDEX "meter_status_idx" ON "meter"("status");

-- CreateIndex
CREATE INDEX "meter_reading_reading_date_idx" ON "meter_reading"("reading_date");

-- CreateIndex
CREATE INDEX "meter_reading_abnormal_idx" ON "meter_reading"("abnormal");

-- CreateIndex
CREATE UNIQUE INDEX "meter_reading_meter_id_reading_date_key" ON "meter_reading"("meter_id", "reading_date");

-- CreateIndex
CREATE UNIQUE INDEX "billing_cycle_period_key" ON "billing_cycle"("period");

-- CreateIndex
CREATE UNIQUE INDEX "bill_bill_number_key" ON "bill"("bill_number");

-- CreateIndex
CREATE INDEX "bill_cycle_id_idx" ON "bill"("cycle_id");

-- CreateIndex
CREATE INDEX "bill_account_id_idx" ON "bill"("account_id");

-- CreateIndex
CREATE INDEX "bill_payer_id_idx" ON "bill"("payer_id");

-- CreateIndex
CREATE INDEX "bill_status_idx" ON "bill"("status");

-- CreateIndex
CREATE INDEX "bill_flagged_idx" ON "bill"("flagged");

-- CreateIndex
CREATE INDEX "bill_due_date_idx" ON "bill"("due_date");

-- CreateIndex
CREATE INDEX "notification_related_type_related_id_idx" ON "notification"("related_type", "related_id");

-- CreateIndex
CREATE INDEX "notification_status_idx" ON "notification"("status");

-- CreateIndex
CREATE INDEX "payment_bill_id_idx" ON "payment"("bill_id");

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_tier" ADD CONSTRAINT "tariff_tier_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "tariff_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_account" ADD CONSTRAINT "water_account_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "payer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_account" ADD CONSTRAINT "water_account_tariff_category_id_fkey" FOREIGN KEY ("tariff_category_id") REFERENCES "tariff_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter" ADD CONSTRAINT "meter_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "water_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter" ADD CONSTRAINT "meter_replaces_meter_id_fkey" FOREIGN KEY ("replaces_meter_id") REFERENCES "meter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_reading" ADD CONSTRAINT "meter_reading_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "meter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_reading" ADD CONSTRAINT "meter_reading_bulk_upload_id_fkey" FOREIGN KEY ("bulk_upload_id") REFERENCES "bulk_upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "billing_cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "water_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "payer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
