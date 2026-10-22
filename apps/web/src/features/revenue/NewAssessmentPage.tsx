import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Select, Stack, Text, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type ReactElement, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { RateType } from '@ircub/shared';

import { createAssessment } from '../../api/assessments.api';
import { listPayers } from '../../api/payers.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { listRevenueTypes } from '../../api/revenue-types.api';
import { ROUTES } from '../../app/routes.constants';
import { PageHeader } from '../../components/PageHeader';
import { LOCAL_CURRENCY } from '../../lib/currency.constants';
import { formatMoney } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';

import { type NewAssessmentForm, newAssessmentSchema } from './assessment.schema';

const PAYER_SEARCH_LIMIT = 20;
const PERCENT = 100;
const MONEY_DECIMALS = 2;

/** Pure preview so the amount the officer sees is what the server will compute. */
function previewAmount(
  rateType: RateType | undefined,
  rate: string | undefined,
  baseAmount: string | undefined,
): string | null {
  if (rateType === undefined || rate === undefined) {
    return null;
  }
  if (rateType === RateType.FIXED) {
    return rate;
  }
  const base = Number(baseAmount);
  return Number.isFinite(base) && base > 0
    ? ((base * Number(rate)) / PERCENT).toFixed(MONEY_DECIMALS)
    : null;
}

export function NewAssessmentPage(): ReactElement {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const payers = useQuery({
    queryKey: QUERY_KEYS.payers({ search, limit: PAYER_SEARCH_LIMIT }),
    queryFn: () =>
      listPayers({
        page: 1,
        pageSize: PAYER_SEARCH_LIMIT,
        ...(search.length > 0 ? { search } : {}),
      }),
  });
  const types = useQuery({
    queryKey: QUERY_KEYS.revenueTypes(false),
    queryFn: () => listRevenueTypes(false),
  });
  const form = useForm<NewAssessmentForm>({
    resolver: zodResolver(newAssessmentSchema),
    defaultValues: { payerId: '', revenueTypeId: '' },
  });
  const revenueTypeId = form.watch('revenueTypeId');
  const baseAmount = form.watch('baseAmount');
  const selectedType = useMemo(
    () => types.data?.find((t) => t.id === revenueTypeId),
    [types.data, revenueTypeId],
  );
  const preview = previewAmount(selectedType?.rateType, selectedType?.rate, baseAmount);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const created = await createAssessment({
        payerId: values.payerId,
        revenueTypeId: values.revenueTypeId,
        ...(values.baseAmount ? { baseAmount: values.baseAmount } : {}),
        ...(values.period ? { period: values.period } : {}),
        ...(values.dueDate ? { dueDate: values.dueDate } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      });
      notifySuccess(`Assessment ${created.controlNumber} created`);
      await navigate({ to: ROUTES.ASSESSMENTS });
    } catch (caught: unknown) {
      notifyError(caught);
    }
  });

  return (
    <Stack maw={640}>
      <PageHeader title="New assessment" />
      <Card withBorder>
        <form onSubmit={(event) => void onSubmit(event)}>
          <Stack>
            <Controller
              control={form.control}
              name="payerId"
              render={({ field }) => (
                <Select
                  label="Payer"
                  placeholder="Search by name, TIN or phone"
                  searchable
                  onSearchChange={setSearch}
                  searchValue={search}
                  data={(payers.data?.items ?? []).map((p) => ({
                    value: p.id,
                    label: `${p.name} · ${p.tin}`,
                  }))}
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v ?? '');
                  }}
                  error={form.formState.errors.payerId?.message}
                  nothingFoundMessage="No payers"
                />
              )}
            />
            <Controller
              control={form.control}
              name="revenueTypeId"
              render={({ field }) => (
                <Select
                  label="Revenue type"
                  data={(types.data ?? []).map((t) => ({
                    value: t.id,
                    label: `${t.name} (${t.rateType === RateType.PERCENT ? `${t.rate} %` : formatMoney(t.rate, LOCAL_CURRENCY)})`,
                  }))}
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v ?? '');
                  }}
                  error={form.formState.errors.revenueTypeId?.message}
                />
              )}
            />
            {selectedType?.rateType === RateType.PERCENT && (
              <TextInput
                label={`Base amount (${LOCAL_CURRENCY})`}
                placeholder="e.g. property value"
                {...form.register('baseAmount')}
              />
            )}
            <TextInput label="Period" placeholder="2026 or 2026-03" {...form.register('period')} />
            <Controller
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <DateInput
                  label="Due date"
                  placeholder="Default: 30 days"
                  clearable
                  value={field.value ? new Date(field.value) : null}
                  onChange={(d) => {
                    field.onChange(d === null ? '' : new Date(d).toISOString());
                  }}
                  valueFormat="YYYY-MM-DD"
                />
              )}
            />
            <TextInput label="Notes" {...form.register('notes')} />
            <Alert color={preview === null ? 'gray' : 'teal'}>
              <Text fw={600}>
                {preview === null
                  ? 'Amount preview: choose a revenue type'
                  : `Amount: ${formatMoney(preview, LOCAL_CURRENCY)}`}
              </Text>
              <Text size="xs" c="dimmed">
                The control number is generated on save.
              </Text>
            </Alert>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Create assessment
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
