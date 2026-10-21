/**
 * Codes of the six built-in roles seeded in phase 1.
 *
 * Business logic never branches on these — it checks permissions. The codes exist so the
 * seed, the admin UI and the tests can refer to the system roles by a stable name.
 */
export const ROLES = {
  SYSTEM_ADMINISTRATOR: 'SYSTEM_ADMINISTRATOR',
  REVENUE_SUPERVISOR: 'REVENUE_SUPERVISOR',
  REVENUE_OFFICER: 'REVENUE_OFFICER',
  WATER_BILLING_OFFICER: 'WATER_BILLING_OFFICER',
  AUDITOR: 'AUDITOR',
  CUSTOMER: 'CUSTOMER',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_CODES: readonly RoleCode[] = Object.values(ROLES);
