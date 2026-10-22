import { AUDIT_UI } from './audit.constants';

import type { FieldChange } from './audit.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Field-level diff of a before/after snapshot pair: every key whose value changed, with the
 * two values rendered as JSON. A create lists every field as added, a delete as removed.
 */
export function diffSnapshots(before: unknown, after: unknown): FieldChange[] {
  const left = isRecord(before) ? before : {};
  const right = isRecord(after) ? after : {};
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return keys
    .filter((key) => !same(left[key], right[key]))
    .map((key) => ({
      field: key,
      before: key in left ? JSON.stringify(left[key]) : null,
      after: key in right ? JSON.stringify(right[key]) : null,
    }));
}

/** The first and last few characters of a hash: enough to eyeball a chain in a table. */
export function shortHash(hash: string, edge: number): string {
  return hash.length <= edge * AUDIT_UI.HASH_ENDS
    ? hash
    : `${hash.slice(0, edge)}…${hash.slice(-edge)}`;
}
