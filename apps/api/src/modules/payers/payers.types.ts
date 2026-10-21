import type { DuplicateMatchField } from '@ircub/shared';

import type { PAYERS_API } from './payers.constants';
import type { Prisma } from '@prisma/client';

export type PayerSortField = (typeof PAYERS_API.SORTABLE)[number];

/** Identity fields compared for duplicate detection, already normalised. */
export interface PayerIdentity {
  readonly phone: string;
  readonly email: string | null;
  readonly nationalId: string | null;
}

export interface DuplicateCandidate {
  readonly matchedPayerId: string;
  readonly matchField: DuplicateMatchField;
}

export type DuplicateFlagWithPayers = Prisma.DuplicateFlagGetPayload<{
  include: { payer: true; matchedPayer: true };
}>;
