export interface FieldChange {
  readonly field: string;
  readonly before: string | null;
  readonly after: string | null;
}
