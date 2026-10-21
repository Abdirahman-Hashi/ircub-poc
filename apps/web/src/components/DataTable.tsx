import { MantineReactTable, type MRT_RowData, useMantineReactTable } from 'mantine-react-table';

import { PAGE_SIZE_OPTIONS } from './DataTable.constants';

import type { DataTableProps } from './DataTable.types';
import type { ReactElement } from 'react';

/**
 * Server-side paginated table used by every list screen (apps/web/CLAUDE.md). Sorting and
 * filtering are driven by the caller through query params, not by the table.
 */
export function DataTable<T extends MRT_RowData>(props: DataTableProps<T>): ReactElement {
  const table = useMantineReactTable<T>({
    columns: props.columns,
    data: props.data as T[],
    rowCount: props.total,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableSorting: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableColumnActions: false,
    state: { pagination: props.pagination, isLoading: props.isLoading },
    onPaginationChange: (updater) => {
      props.onPaginationChange(typeof updater === 'function' ? updater(props.pagination) : updater);
    },
    mantinePaginationProps: { rowsPerPageOptions: PAGE_SIZE_OPTIONS.map(String) },
    renderTopToolbarCustomActions: () => props.toolbar ?? null,
    ...(props.rowActions === undefined
      ? {}
      : {
          enableRowActions: true,
          positionActionsColumn: 'last' as const,
          renderRowActions: ({ row }) => props.rowActions?.(row.original),
        }),
  });
  return <MantineReactTable table={table} />;
}
