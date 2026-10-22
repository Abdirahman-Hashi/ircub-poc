import type { PermissionCode, RoleCode } from '@ircub/shared';

import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';

export interface RoleSeed {
  readonly code: RoleCode;
  readonly name: string;
  readonly description: string;
  readonly parentCode: RoleCode | null;
  /** Direct permissions; `{ allExcept }` grants every code but the listed ones. */
  readonly permissions:
    readonly PermissionCode[] | { readonly allExcept: readonly PermissionCode[] };
}

export interface UserSeed {
  readonly email: string;
  readonly fullName: string;
  readonly roleCodes: readonly RoleCode[];
}

export interface RevenueTypeSeed {
  readonly code: string;
  readonly name: string;
  readonly rateType: import('@ircub/shared').RateType;
  readonly rate: string;
  readonly glCode: string;
  readonly description: string;
}

/** Result of posting one seeded batch to the mock FMIS. */
export type FmisPostOutcome =
  | { readonly kind: 'posted'; readonly reference: string }
  | { readonly kind: 'rejected'; readonly error: string }
  | { readonly kind: 'unreachable' };

export interface FmisSeedTotals {
  posted: number;
  failed: number;
  pending: number;
  reversals: number;
  reachable: boolean;
}

export interface FmisSeedContext {
  readonly prisma: ExtendedPrismaClient;
  readonly mocksBaseUrl: string | undefined;
  readonly cashGl: string;
  readonly retryLimit: number;
  readonly glByType: ReadonlyMap<string, string>;
  readonly waterTypeId: string | null;
  readonly now: Date;
}
