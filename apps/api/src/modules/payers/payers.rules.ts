import { DuplicateMatchField, PHONE } from '@ircub/shared';

import type { DuplicateCandidate, PayerIdentity } from './payers.types';

const NON_DIGITS = /[^0-9]/g;

/**
 * Phone → E.164: keep a leading `+`, drop spaces/dashes/brackets, and replace a local trunk
 * prefix (`0…`) with the configured country code. Returns null when the result is not a
 * plausible E.164 number so the caller can reject it.
 */
export function normalisePhone(raw: string, defaultCountryCode: string): string | null {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(NON_DIGITS, '');
  if (!hasPlus && digits.startsWith(PHONE.TRUNK_PREFIX)) {
    digits = digits.slice(PHONE.TRUNK_PREFIX.length);
  }
  const candidate = hasPlus ? `+${digits}` : `${defaultCountryCode}${digits}`;
  return PHONE.E164_PATTERN.test(candidate) ? candidate : null;
}

export function normaliseEmail(raw: string | null | undefined): string | null {
  const value = raw?.trim().toLowerCase() ?? '';
  return value.length === 0 ? null : value;
}

export function normaliseNationalId(raw: string | null | undefined): string | null {
  const value = raw?.trim().toUpperCase().replace(/\s+/g, '') ?? '';
  return value.length === 0 ? null : value;
}

/**
 * Pure duplicate detection: exact matches on normalised phone, email and national id
 * against existing payers (excluding the payer itself). One candidate per (payer, field).
 */
export function findDuplicateCandidates(
  subject: PayerIdentity & { readonly id?: string },
  existing: readonly (PayerIdentity & { readonly id: string })[],
): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];
  for (const other of existing) {
    if (other.id === subject.id) {
      continue;
    }
    if (other.phone === subject.phone) {
      candidates.push({ matchedPayerId: other.id, matchField: DuplicateMatchField.PHONE });
    }
    if (subject.email !== null && other.email === subject.email) {
      candidates.push({ matchedPayerId: other.id, matchField: DuplicateMatchField.EMAIL });
    }
    if (subject.nationalId !== null && other.nationalId === subject.nationalId) {
      candidates.push({ matchedPayerId: other.id, matchField: DuplicateMatchField.NATIONAL_ID });
    }
  }
  return candidates;
}
