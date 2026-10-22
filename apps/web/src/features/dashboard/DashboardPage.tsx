import { Card, Group, SegmentedControl, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DASHBOARD, PERMISSIONS } from '@ircub/shared';

import {
  acknowledgeAlert,
  getEfficiency,
  getForecast,
  getOverview,
  getTargetAttainment,
  getTrends,
  listAlerts,
} from '../../api/dashboard.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { useCan } from '../../lib/auth';
import { formatCompact, formatMoney } from '../../lib/format';
import { useLiveEvent } from '../../lib/live-events';
import { LIVE_EVENT } from '../../lib/live-events.constants';
import { notifyError } from '../../lib/notify';
import { LOCAL_CURRENCY } from '../payments/payments.constants';

import { AlertsPanel } from './AlertsPanel';
import { DASHBOARD_UI, RANGE_PRESETS, SERIES_COLORS } from './dashboard.constants';
import { formatPercent, monthsOf, presetRange } from './dashboard.rules';
import { ForecastChart } from './ForecastChart';

import type { RangePreset } from './dashboard.types';

const AXIS_WIDTH = 64;

function Kpi({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: ReactElement | string;
  readonly hint?: string;
}): ReactElement {
  return (
    <Card withBorder>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      {typeof value === 'string' ? (
        <Text fw={700} size="lg">
          {value}
        </Text>
      ) : (
        value
      )}
      {hint !== undefined && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Card>
  );
}

/** Executive dashboard (brief Module 7): server-aggregated KPIs, trends, targets, efficiency, forecast, live alerts. */
export function DashboardPage(): ReactElement {
  const queryClient = useQueryClient();
  const canAck = useCan(PERMISSIONS.ALERTS_VIEW);
  const [preset, setPreset] = useState<RangePreset>(DASHBOARD_UI.DEFAULT_PRESET);
  const [groupBy, setGroupBy] = useState<string>(DASHBOARD.GROUP_BY.DAY);
  const [by, setBy] = useState<string>(DASHBOARD.BY.REVENUE_TYPE);
  const [model, setModel] = useState<string>(DASHBOARD_UI.DEFAULT_FORECAST_MODEL);
  const range = useMemo(() => presetRange(preset, new Date()), [preset]);
  const months = monthsOf(range);

  const overview = useQuery({
    queryKey: QUERY_KEYS.overview(range),
    queryFn: () => getOverview(range.from, range.to),
    refetchInterval: DASHBOARD_UI.REFRESH_MS,
  });
  const trends = useQuery({
    queryKey: QUERY_KEYS.trends({ ...range, groupBy, by }),
    queryFn: () => getTrends({ ...range, groupBy, by }),
    placeholderData: (p) => p,
  });
  const targets = useQuery({
    queryKey: QUERY_KEYS.targetAttainment(months),
    queryFn: () => getTargetAttainment(months.from, months.to),
  });
  const efficiency = useQuery({
    queryKey: QUERY_KEYS.efficiency(range),
    queryFn: () => getEfficiency(range.from, range.to),
  });
  const forecast = useQuery({
    queryKey: QUERY_KEYS.forecast({ model }),
    queryFn: () => getForecast({ model }),
  });
  const alerts = useQuery({
    queryKey: QUERY_KEYS.alerts({ acknowledged: false }),
    queryFn: () =>
      listAlerts({ page: 1, pageSize: DASHBOARD_UI.ALERTS_PAGE_SIZE, acknowledged: false }),
    enabled: canAck,
  });
  const ack = useMutation({
    mutationFn: (id: string) => acknowledgeAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    onError: notifyError,
  });
  useLiveEvent((event) => {
    if (event.type === LIVE_EVENT.ALERT_CREATED) {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
    } else {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const o = overview.data;
  const trendRows = useMemo(() => {
    const data = trends.data;
    if (data === undefined) {
      return [];
    }
    return data.buckets.map((bucket, index) => {
      const row: Record<string, string | number> = { bucket };
      for (const series of data.series) {
        row[series.label] = Number(series.points[index]?.total ?? 0);
      }
      return row;
    });
  }, [trends.data]);
  const targetRows = useMemo(() => {
    const byType = new Map<string, { name: string; collected: number; target: number }>();
    for (const row of targets.data ?? []) {
      const current = byType.get(row.revenueTypeId) ?? {
        name: row.revenueType.name,
        collected: 0,
        target: 0,
      };
      byType.set(row.revenueTypeId, {
        name: current.name,
        collected: current.collected + Number(row.collected),
        target: current.target + Number(row.target),
      });
    }
    return [...byType.values()].map((t) => ({
      ...t,
      attainment: t.target === 0 ? null : (t.collected / t.target) * DASHBOARD_UI.PERCENT,
    }));
  }, [targets.data]);
  const efficiencyRows = (efficiency.data ?? []).map((r) => ({
    period: r.period,
    billed: Number(r.billed),
    collected: Number(r.collected),
    efficiency: r.efficiencyPct,
  }));

  return (
    <Stack>
      <PageHeader
        title="Executive dashboard"
        actions={
          <SegmentedControl
            value={preset}
            onChange={(value) => {
              setPreset(value as RangePreset);
            }}
            data={RANGE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          />
        }
      />
      <Text size="sm" c="dimmed">
        {range.from} → {range.to}. Figures come from pre-aggregated daily summaries and refresh
        every minute; alerts arrive live.
      </Text>
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <Kpi
          label="Collected"
          value={
            <MoneyText
              amount={o?.collected ?? '0'}
              currency={LOCAL_CURRENCY}
              fw={700}
              size="lg"
              ta="left"
            />
          }
          hint={`${o?.collectedCount ?? 0} payments · ${o?.changeVsLastYearPct === null || o?.changeVsLastYearPct === undefined ? 'no prior-year baseline' : `${o.changeVsLastYearPct > 0 ? '+' : ''}${o.changeVsLastYearPct.toFixed(1)} % vs same period last year`}`}
        />
        <Kpi
          label="Reversed"
          value={
            <MoneyText
              amount={o?.reversed ?? '0'}
              currency={LOCAL_CURRENCY}
              fw={700}
              size="lg"
              ta="left"
            />
          }
          hint={`${o?.reversedCount ?? 0} reversals`}
        />
        <Kpi
          label="Outstanding assessments"
          value={
            <MoneyText
              amount={o?.outstandingAssessments ?? '0'}
              currency={LOCAL_CURRENCY}
              fw={700}
              size="lg"
              ta="left"
            />
          }
        />
        <Kpi
          label="Outstanding water"
          value={
            <MoneyText
              amount={o?.outstandingWater ?? '0'}
              currency={LOCAL_CURRENCY}
              fw={700}
              size="lg"
              ta="left"
            />
          }
        />
        <Kpi
          label="Collection efficiency (water)"
          value={formatPercent(o?.collectionEfficiencyPct ?? null, DASHBOARD_UI.PERCENT_DECIMALS)}
          hint={`${formatMoney(o?.waterCollected ?? '0', LOCAL_CURRENCY)} of ${formatMoney(o?.waterBilled ?? '0', LOCAL_CURRENCY)} billed`}
        />
        <Kpi
          label="Target attainment (tax)"
          value={formatPercent(o?.targetAttainmentPct ?? null, DASHBOARD_UI.PERCENT_DECIMALS)}
          hint={`target ${formatMoney(o?.target ?? '0', LOCAL_CURRENCY)}`}
        />
        <Kpi
          label="Same period last year"
          value={
            <MoneyText
              amount={o?.collectedLastYear ?? '0'}
              currency={LOCAL_CURRENCY}
              fw={700}
              size="lg"
              ta="left"
            />
          }
        />
        <Kpi label="Open alerts" value={String(alerts.data?.total ?? 0)} />
      </SimpleGrid>

      <Card withBorder>
        <Group justify="space-between" mb="xs">
          <Title order={5}>Revenue trends</Title>
          <Group gap="xs">
            <SegmentedControl
              size="xs"
              value={by}
              onChange={setBy}
              data={[
                { value: DASHBOARD.BY.REVENUE_TYPE, label: 'By revenue type' },
                { value: DASHBOARD.BY.CHANNEL, label: 'By channel' },
              ]}
            />
            <SegmentedControl
              size="xs"
              value={groupBy}
              onChange={setGroupBy}
              data={[
                { value: DASHBOARD.GROUP_BY.DAY, label: 'Day' },
                { value: DASHBOARD.GROUP_BY.WEEK, label: 'Week' },
                { value: DASHBOARD.GROUP_BY.MONTH, label: 'Month' },
              ]}
            />
          </Group>
        </Group>
        <ResponsiveContainer width="100%" height={DASHBOARD_UI.CHART_HEIGHT}>
          <LineChart data={trendRows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" minTickGap={24} />
            <YAxis tickFormatter={formatCompact} width={AXIS_WIDTH} />
            <Tooltip />
            <Legend />
            {(trends.data?.series ?? []).map((series, index) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.label}
                stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card withBorder>
          <Title order={5} mb="xs">
            Collections vs targets ({months.from} → {months.to})
          </Title>
          <ResponsiveContainer width="100%" height={DASHBOARD_UI.CHART_HEIGHT}>
            <BarChart data={targetRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={formatCompact} width={AXIS_WIDTH} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'attainment'
                    ? formatPercent(value, DASHBOARD_UI.PERCENT_DECIMALS)
                    : formatMoney(value, LOCAL_CURRENCY)
                }
              />
              <Legend />
              <Bar dataKey="collected" name="Collected" fill={SERIES_COLORS[0]} />
              <Bar dataKey="target" name="Target" fill={SERIES_COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
          <Group gap="md" mt="xs">
            {targetRows.map((row) => (
              <Text key={row.name} size="xs" c="dimmed">
                {row.name}: {formatPercent(row.attainment, DASHBOARD_UI.PERCENT_DECIMALS)}
              </Text>
            ))}
          </Group>
        </Card>
        <Card withBorder>
          <Title order={5} mb="xs">
            Water billed vs collected
          </Title>
          <ResponsiveContainer width="100%" height={DASHBOARD_UI.CHART_HEIGHT}>
            <ComposedChart data={efficiencyRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="money" tickFormatter={formatCompact} width={AXIS_WIDTH} />
              <YAxis yAxisId="pct" orientation="right" unit="%" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="money" dataKey="billed" name="Billed" fill={SERIES_COLORS[1]} />
              <Bar yAxisId="money" dataKey="collected" name="Collected" fill={SERIES_COLORS[0]} />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="efficiency"
                name="Efficiency %"
                stroke={SERIES_COLORS[2]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card withBorder>
          <ForecastChart series={forecast.data?.series[0]} model={model} onModelChange={setModel} />
        </Card>
        <AlertsPanel
          alerts={alerts.data?.items ?? []}
          onAcknowledge={(id) => {
            ack.mutate(id);
          }}
          acknowledging={ack.isPending}
          canAcknowledge={canAck}
        />
      </SimpleGrid>
    </Stack>
  );
}
