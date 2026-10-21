import { PAGINATION } from '@ircub/shared';

import type { MRT_PaginationState } from 'mantine-react-table';

export const INITIAL_PAGINATION: MRT_PaginationState = {
  pageIndex: 0,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
};

/** Table pagination (0-based) → API query (1-based). */
export function toPageParams(pagination: MRT_PaginationState): { page: number; pageSize: number } {
  return { page: pagination.pageIndex + 1, pageSize: pagination.pageSize };
}
