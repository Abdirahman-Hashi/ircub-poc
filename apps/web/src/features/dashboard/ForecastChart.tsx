import { Badge, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DASHBOARD } from '@ircub/shared';

import { formatCompact } from '../../lib/format';

import { DASHBOARD_UI, SERIES_COLORS } from './dashboard.constants';
import { toForecastRows } from './dashboard.rules';

import type { ForecastResult } from '../../api/types';
import type { ReactElement } from 'react';

const R2_DECIMALS = 3;
const AXIS_WIDTH = 64;
const SLOPE_DECIMALS = 0;

/** History solid, projection dashed; model toggle, R², slope and the model's caveat. */
export function ForecastChart({
  series,
  model,
  onModelChange,
}: {
  readonly series: ForecastResult | undefined;
  readonly model: string;
  readonly onModelChange: (model: string) => void;
}): ReactElement {
  const rows = series === undefined ? [] : toForecastRows(series.points);
  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={600}>
          Forecast (next {series?.points.filter((p) => p.forecast).length ?? 0} months)
        </Text>
        <SegmentedControl
          size="xs"
          value={model}
          onChange={onModelChange}
          data={[
            { value: DASHBOARD.FORECAST_MODEL.OLS, label: 'OLS regression' },
            { value: DASHBOARD.FORECAST_MODEL.HOLT, label: 'Holt smoothing' },
          ]}
        />
      </Group>
      <ResponsiveContainer width="100%" height={DASHBOARD_UI.CHART_HEIGHT}>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis tickFormatter={formatCompact} width={AXIS_WIDTH} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="history"
            name="Collected"
            stroke={SERIES_COLORS[0]}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="projection"
            name="Projected"
            stroke={SERIES_COLORS[2]}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {series !== undefined && (
        <Group gap="xs">
          <Badge variant="light">{series.model}</Badge>
          <Badge
            variant="light"
            color={series.r2 !== null && series.r2 >= DASHBOARD_UI.GOOD_R2 ? 'teal' : 'gray'}
          >
            R² {series.r2 === null ? 'n/a' : series.r2.toFixed(R2_DECIMALS)}
          </Badge>
          <Badge variant="light">slope {series.slope.toFixed(SLOPE_DECIMALS)} / month</Badge>
          <Text size="xs" c="dimmed">
            {series.caveat}
          </Text>
        </Group>
      )}
    </Stack>
  );
}
