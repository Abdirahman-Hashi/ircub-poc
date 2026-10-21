import type { applyAuditExtension } from '../common/audit/audit.extension';
import type { PrismaClient } from '@prisma/client';

export type PrismaClientOptions = NonNullable<ConstructorParameters<typeof PrismaClient>[0]>;

/** PrismaClient with the audit extension applied — the type `PrismaService` exposes. */
export type ExtendedPrismaClient = ReturnType<typeof applyAuditExtension>;

/** Client handed to interactive-transaction callbacks (`prisma.$transaction(async (tx) => …)`). */
export type TransactionClient = Omit<
  ExtendedPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
