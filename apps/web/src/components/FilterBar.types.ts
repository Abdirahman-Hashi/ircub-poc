export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

export type FilterFieldKind = 'text' | 'select' | 'number' | 'date';

export interface FilterField {
  readonly name: string;
  readonly label: string;
  readonly kind: FilterFieldKind;
  readonly options?: readonly FilterOption[];
  readonly placeholder?: string;
}

export type FilterValues = Readonly<Record<string, string>>;

export interface FilterBarProps {
  readonly fields: readonly FilterField[];
  readonly values: FilterValues;
  readonly onChange: (next: FilterValues) => void;
  readonly onReset?: () => void;
}
