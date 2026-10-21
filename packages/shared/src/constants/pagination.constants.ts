/** Defaults for every paginated list endpoint (`?page=&pageSize=`). */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  /** Query parameter separator for `sort=field:asc`. */
  SORT_SEPARATOR: ':',
} as const;

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
