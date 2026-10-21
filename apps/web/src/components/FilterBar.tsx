import { Button, Group, NumberInput, Select, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';

import type { FilterBarProps, FilterField } from './FilterBar.types';
import type { ReactElement } from 'react';

const FIELD_WIDTH = 170;

/** Schema-driven filter row reused by every list screen (apps/web/CLAUDE.md). */
export function FilterBar({ fields, values, onChange, onReset }: FilterBarProps): ReactElement {
  const set = (name: string, value: string): void => {
    const next = Object.fromEntries(Object.entries(values).filter(([key]) => key !== name));
    onChange(value.length === 0 ? next : { ...next, [name]: value });
  };

  return (
    <Group align="flex-end" gap="xs" wrap="wrap">
      {fields.map((field) => (
        <FilterInput
          key={field.name}
          field={field}
          value={values[field.name] ?? ''}
          onChange={(value) => {
            set(field.name, value);
          }}
        />
      ))}
      {onReset !== undefined && (
        <Button variant="subtle" size="xs" onClick={onReset}>
          Clear
        </Button>
      )}
    </Group>
  );
}

function FilterInput({
  field,
  value,
  onChange,
}: {
  readonly field: FilterField;
  readonly value: string;
  readonly onChange: (value: string) => void;
}): ReactElement {
  switch (field.kind) {
    case 'select':
      return (
        <Select
          label={field.label}
          placeholder={field.placeholder ?? 'Any'}
          clearable
          data={[...(field.options ?? [])]}
          value={value.length === 0 ? null : value}
          onChange={(next) => {
            onChange(next ?? '');
          }}
          w={FIELD_WIDTH}
          size="xs"
        />
      );
    case 'number':
      return (
        <NumberInput
          label={field.label}
          placeholder={field.placeholder}
          value={value.length === 0 ? '' : Number(value)}
          onChange={(next) => {
            onChange(next === '' ? '' : String(next));
          }}
          w={FIELD_WIDTH}
          size="xs"
          hideControls
        />
      );
    case 'date':
      return (
        <DateInput
          label={field.label}
          placeholder={field.placeholder ?? 'Any'}
          clearable
          value={value.length === 0 ? null : new Date(value)}
          onChange={(next) => {
            onChange(next === null ? '' : new Date(next).toISOString());
          }}
          w={FIELD_WIDTH}
          size="xs"
          valueFormat="YYYY-MM-DD"
        />
      );
    default:
      return (
        <TextInput
          label={field.label}
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
          w={FIELD_WIDTH}
          size="xs"
        />
      );
  }
}
