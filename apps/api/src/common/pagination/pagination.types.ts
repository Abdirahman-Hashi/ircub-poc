import type { SortDirection } from '@ircub/shared';

export interface PageSlice {
  readonly skip: number;
  readonly take: number;
}

export interface SortSpec<TField extends string = string> {
  readonly field: TField;
  readonly direction: SortDirection;
}
