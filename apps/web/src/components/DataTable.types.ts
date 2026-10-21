import type { MRT_ColumnDef, MRT_PaginationState, MRT_RowData } from 'mantine-react-table';
import type { ReactNode } from 'react';

export interface DataTableProps<T extends MRT_RowData> {
  readonly columns: MRT_ColumnDef<T>[];
  readonly data: readonly T[];
  readonly total: number;
  readonly pagination: MRT_PaginationState;
  readonly onPaginationChange: (next: MRT_PaginationState) => void;
  readonly isLoading: boolean;
  readonly toolbar?: ReactNode;
  readonly rowActions?: (row: T) => ReactNode;
}
