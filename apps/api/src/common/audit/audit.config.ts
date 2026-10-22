import type { AuditedModelMap } from './audit.types';

/**
 * Models whose mutations are written to the audit log (standards: "every mutation of a
 * business entity is audited"). Later phases add their models here in the same commit as
 * the Prisma model. Secret-bearing fields are redacted; composite-key models name their
 * key fields so the entity id is stable.
 */
export const AUDITED_MODELS: AuditedModelMap = {
  User: { redact: ['passwordHash', 'mfaSecret'] },
  Role: {},
  Permission: {},
  RolePermission: { idFields: ['roleId', 'permissionId'] },
  UserRole: { idFields: ['userId', 'roleId'] },
  SodRule: {},
  SystemConfig: { idFields: ['key'] },
  Payer: {},
  DuplicateFlag: {},
  RevenueType: {},
  Assessment: {},
  Payment: {},
  Reversal: {},
  BulkUpload: {},
  FxRate: {},
  TariffCategory: {},
  TariffTier: {},
  WaterAccount: {},
  Meter: {},
  MeterReading: {},
  BillingCycle: {},
  Bill: {},
  Notification: {},
  ChannelStatement: {},
  ReconciliationRun: {},
  GlMapping: {},
  JournalBatch: {},
  JournalLine: {},
  RevenueTarget: {},
  Alert: {},
};
