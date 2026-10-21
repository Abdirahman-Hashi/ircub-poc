/**
 * Permission codes — the only vocabulary for authorisation.
 *
 * Format is `resource.action`. Controllers guard with `@RequirePermission(PERMISSIONS.X)`,
 * the web hides UI with `useCan(PERMISSIONS.X)`, and the phase-1 seed inserts every code
 * below into the `Permission` table. Adding a permission = adding one entry here and one
 * line in a group.
 */
export const PERMISSIONS = {
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  CONFIG_MANAGE: 'config.manage',

  PAYERS_VIEW: 'payers.view',
  PAYERS_REGISTER: 'payers.register',
  PAYERS_REVIEW_DUPLICATES: 'payers.review_duplicates',

  REVENUE_TYPES_MANAGE: 'revenue_types.manage',
  ASSESSMENTS_VIEW: 'assessments.view',
  ASSESSMENTS_CREATE: 'assessments.create',

  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_CAPTURE: 'payments.capture',
  PAYMENTS_SUPERVISE: 'payments.supervise',

  REVERSALS_CAPTURE: 'reversals.capture',
  REVERSALS_APPROVE: 'reversals.approve',

  BULK_UPLOADS_CREATE: 'bulk_uploads.create',

  METERS_READ: 'meters.read',
  BILLING_RUN: 'billing.run',
  BILLING_RELEASE: 'billing.release',
  BILLS_VIEW: 'bills.view',

  FX_VIEW: 'fx.view',
  RECONCILIATION_VIEW: 'reconciliation.view',
  RECONCILIATION_RUN: 'reconciliation.run',

  FMIS_VIEW: 'fmis.view',
  FMIS_POST: 'fmis.post',
  GL_MAPPINGS_MANAGE: 'gl_mappings.manage',

  DASHBOARD_VIEW: 'dashboard.view',
  TARGETS_MANAGE: 'targets.manage',
  ALERTS_VIEW: 'alerts.view',

  AUDIT_VIEW: 'audit.view',
  REPORTS_VIEW: 'reports.view',

  SELF_VIEW: 'self.view',
  SELF_PAY: 'self.pay',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_CODES: readonly PermissionCode[] = Object.values(PERMISSIONS);

export interface PermissionGroup {
  readonly group: string;
  readonly permissions: readonly PermissionCode[];
}

/** Grouping used by the admin role editor (permission matrix) and the seed's `group` column. */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    group: 'Administration',
    permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.ROLES_MANAGE, PERMISSIONS.CONFIG_MANAGE],
  },
  {
    group: 'Payers',
    permissions: [
      PERMISSIONS.PAYERS_VIEW,
      PERMISSIONS.PAYERS_REGISTER,
      PERMISSIONS.PAYERS_REVIEW_DUPLICATES,
    ],
  },
  {
    group: 'Revenue',
    permissions: [
      PERMISSIONS.REVENUE_TYPES_MANAGE,
      PERMISSIONS.ASSESSMENTS_VIEW,
      PERMISSIONS.ASSESSMENTS_CREATE,
      PERMISSIONS.BULK_UPLOADS_CREATE,
    ],
  },
  {
    group: 'Payments',
    permissions: [
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.PAYMENTS_CAPTURE,
      PERMISSIONS.PAYMENTS_SUPERVISE,
      PERMISSIONS.REVERSALS_CAPTURE,
      PERMISSIONS.REVERSALS_APPROVE,
    ],
  },
  {
    group: 'Water billing',
    permissions: [
      PERMISSIONS.METERS_READ,
      PERMISSIONS.BILLING_RUN,
      PERMISSIONS.BILLING_RELEASE,
      PERMISSIONS.BILLS_VIEW,
    ],
  },
  {
    group: 'Channels & FX',
    permissions: [
      PERMISSIONS.FX_VIEW,
      PERMISSIONS.RECONCILIATION_VIEW,
      PERMISSIONS.RECONCILIATION_RUN,
    ],
  },
  {
    group: 'FMIS',
    permissions: [PERMISSIONS.FMIS_VIEW, PERMISSIONS.FMIS_POST, PERMISSIONS.GL_MAPPINGS_MANAGE],
  },
  {
    group: 'Dashboard',
    permissions: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.TARGETS_MANAGE, PERMISSIONS.ALERTS_VIEW],
  },
  {
    group: 'Oversight',
    permissions: [PERMISSIONS.AUDIT_VIEW, PERMISSIONS.REPORTS_VIEW],
  },
  {
    group: 'Customer portal',
    permissions: [PERMISSIONS.SELF_VIEW, PERMISSIONS.SELF_PAY],
  },
];

/** Human-readable descriptions, seeded into `Permission.description` and shown as matrix tooltips. */
export const PERMISSION_DESCRIPTIONS: Readonly<Record<PermissionCode, string>> = {
  [PERMISSIONS.USERS_MANAGE]: 'Create, edit, deactivate users and assign roles',
  [PERMISSIONS.ROLES_MANAGE]: 'Create roles, edit permission matrix, manage SoD rules',
  [PERMISSIONS.CONFIG_MANAGE]: 'Edit runtime system configuration',
  [PERMISSIONS.PAYERS_VIEW]: 'View payers and their 360° profile',
  [PERMISSIONS.PAYERS_REGISTER]: 'Register and edit payers',
  [PERMISSIONS.PAYERS_REVIEW_DUPLICATES]: 'Confirm or dismiss duplicate-payer flags',
  [PERMISSIONS.REVENUE_TYPES_MANAGE]: 'Create and edit revenue types',
  [PERMISSIONS.ASSESSMENTS_VIEW]: 'View assessments',
  [PERMISSIONS.ASSESSMENTS_CREATE]: 'Create assessments',
  [PERMISSIONS.PAYMENTS_VIEW]: 'View payments',
  [PERMISSIONS.PAYMENTS_CAPTURE]: 'Capture and initiate payments',
  [PERMISSIONS.PAYMENTS_SUPERVISE]: 'Receive escalations for failed payments',
  [PERMISSIONS.REVERSALS_CAPTURE]: 'Request a payment reversal',
  [PERMISSIONS.REVERSALS_APPROVE]: 'Approve or reject a reversal request',
  [PERMISSIONS.BULK_UPLOADS_CREATE]: 'Upload bulk CSV files',
  [PERMISSIONS.METERS_READ]: 'Capture meter readings',
  [PERMISSIONS.BILLING_RUN]: 'Run a billing cycle',
  [PERMISSIONS.BILLING_RELEASE]: 'Release bills and notify customers',
  [PERMISSIONS.BILLS_VIEW]: 'View bills and statements',
  [PERMISSIONS.FX_VIEW]: 'View exchange rates',
  [PERMISSIONS.RECONCILIATION_VIEW]: 'View channel reconciliation runs',
  [PERMISSIONS.RECONCILIATION_RUN]: 'Trigger channel reconciliation',
  [PERMISSIONS.FMIS_VIEW]: 'View journal batches and FMIS reconciliation',
  [PERMISSIONS.FMIS_POST]: 'Post or re-post journal batches',
  [PERMISSIONS.GL_MAPPINGS_MANAGE]: 'Maintain revenue type → GL code mappings',
  [PERMISSIONS.DASHBOARD_VIEW]: 'View the executive dashboard',
  [PERMISSIONS.TARGETS_MANAGE]: 'Set revenue targets',
  [PERMISSIONS.ALERTS_VIEW]: 'View and acknowledge alerts',
  [PERMISSIONS.AUDIT_VIEW]: 'View the audit log and verify the chain',
  [PERMISSIONS.REPORTS_VIEW]: 'View reports',
  [PERMISSIONS.SELF_VIEW]: 'View own bills and assessments',
  [PERMISSIONS.SELF_PAY]: 'Pay own bills and assessments',
};
