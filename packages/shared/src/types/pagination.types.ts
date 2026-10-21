import type { SORT_DIRECTIONS } from '../constants/pagination.constants';

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
  readonly sort?: string;
}

/** Envelope returned by every list endpoint. */
export interface Paginated<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
