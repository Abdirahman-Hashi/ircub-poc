import { Text } from '@mantine/core';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatDate } from '../../lib/format';

import type { MeterReadingView } from '../../api/types';
import type { ReactElement } from 'react';

const CHART_HEIGHT = 260;
const BAR_FILL = 'var(--mantine-color-teal-6)';
const ABNORMAL_FILL = 'var(--mantine-color-red-6)';

/** Consumption per reading, oldest first; abnormal readings in red. */
export function ConsumptionChart({
  readings,
}: {
  readonly readings: readonly MeterReadingView[];
}): ReactElement {
  if (readings.length === 0) {
    return <Text c="dimmed">No readings yet.</Text>;
  }
  const data = [...readings]
    .sort((a, b) => new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime())
    .map((reading) => ({
      date: formatDate(reading.readingDate),
      units: reading.consumption,
      abnormal: reading.abnormal,
      value: reading.readingValue,
    }));
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Bar
          dataKey="units"
          name="Units consumed"
          fill={BAR_FILL}
          shape={(props: {
            x?: number;
            y?: number;
            width?: number;
            height?: number;
            payload?: { abnormal?: boolean };
          }) => (
            <rect
              x={props.x}
              y={props.y}
              width={props.width}
              height={props.height}
              fill={props.payload?.abnormal === true ? ABNORMAL_FILL : BAR_FILL}
            />
          )}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
