-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('SOS', 'USD');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "PayerStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING', 'PART_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('CASH', 'BANK', 'MOBILE_MONEY', 'BULK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'PERMANENTLY_FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ReversalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BulkUploadKind" AS ENUM ('REVENUE_TRANSACTIONS', 'METER_READINGS');

-- CreateEnum
CREATE TYPE "ReadingType" AS ENUM ('NORMAL', 'ROLLOVER', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "ReadingSource" AS ENUM ('MANUAL', 'CSV');

-- CreateEnum
CREATE TYPE "MeterStatus" AS ENUM ('ACTIVE', 'REPLACED', 'FAULTY');

-- CreateEnum
CREATE TYPE "WaterAccountStatus" AS ENUM ('ACTIVE', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "BillingCycleStatus" AS ENUM ('DRAFT', 'REVIEW', 'RELEASED');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'FLAGGED', 'RELEASED', 'PART_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ReconciliationLineStatus" AS ENUM ('MATCHED', 'MISSING_IN_IRCUB', 'MISSING_IN_CHANNEL', 'AMOUNT_MISMATCH');

-- CreateEnum
CREATE TYPE "JournalBatchKind" AS ENUM ('COLLECTIONS', 'REVERSAL');

-- CreateEnum
CREATE TYPE "JournalBatchStatus" AS ENUM ('PENDING', 'POSTED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "FmisReconciliationStatus" AS ENUM ('MATCHED', 'MISMATCH', 'MISSING_IN_FMIS');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('COLLECTION_DROP', 'REVERSAL_SPIKE', 'PAYMENT_PERMANENTLY_FAILED', 'FMIS_BATCH_FAILED', 'ABNORMAL_CONSUMPTION');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ControlNumberPurpose" AS ENUM ('ASSESSMENT', 'BILL');

-- CreateTable
CREATE TABLE "system_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" TEXT,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "control_number" (
    "id" BIGSERIAL NOT NULL,
    "purpose" "ControlNumberPurpose" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_number_pkey" PRIMARY KEY ("id")
);
