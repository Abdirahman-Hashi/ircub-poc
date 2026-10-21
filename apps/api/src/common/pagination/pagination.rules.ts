import { PAGINATION, SORT_DIRECTIONS, type Paginated, type SortDirection } from '@ircub/shared';

import type { PageSlice, SortSpec } from './pagination.types';

/** `?page=&pageSize=` → Prisma `skip`/`take`, clamped to the shared limits. */
export function toPageSlice(page: number, pageSize: number): PageSlice {
  const safePage = Math.max(PAGINATION.DEFAULT_PAGE, page);
  const safeSize = Math.min(PAGINATION.MAX_PAGE_SIZE, Math.max(1, pageSize));
  return { skip: (safePage - PAGINATION.DEFAULT_PAGE) * safeSize, take: safeSize };
}

export function toPaginated<T>(
  items: readonly T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return { items, total, page, pageSize };
}

/**
 * Parses `sort=field:asc` against an allow-list so clients cannot sort by arbitrary
 * columns. Returns the fallback when the parameter is absent or not allowed.
 */
export function parseSort<TField extends string>(
  raw: string | undefined,
  allowed: readonly TField[],
  fallback: SortSpec<TField>,
): SortSpec<TField> {
  if (raw === undefined) {
    return fallback;
  }
  const [field, direction] = raw.split(PAGINATION.SORT_SEPARATOR);
  if (!(allowed as readonly string[]).includes(field ?? '')) {
    return fallback;
  }
  const safeDirection = (SORT_DIRECTIONS as readonly string[]).includes(direction ?? '')
    ? (direction as SortDirection)
    : fallback.direction;
  return { field: field as TField, direction: safeDirection };
}
