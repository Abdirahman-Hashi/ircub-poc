import { Badge, Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getLatestRate, getRateHistory, refreshRate } from '../../api/fx.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { PageHeader } from '../../components/PageHeader';
import { formatDateTime } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';

import type { ReactElement } from 'react';

const CHART_HEIGHT = 280;
const LINE_COLOR = 'var(--mantine-color-blue-6)';

/** FX rate used for USD payments (D9/D15): latest quote, provenance and recent history. */
export function FxPage(): ReactElement {
  const queryClient = useQueryClient();
  const latest = useQuery({ queryKey: QUERY_KEYS.fxLatest, queryFn: getLatestRate });
  const history = useQuery({ queryKey: QUERY_KEYS.fxHistory, queryFn: getRateHistory });
  const refresh = useMutation({
    mutationFn: refreshRate,
    onSuccess: async (rate) => {
      notifySuccess(`Rate refreshed: 1 ${rate.base} = ${rate.rate} ${rate.quote}`);
      await queryClient.invalidateQueries({ queryKey: ['fx'] });
    },
    onError: notifyError,
  });
  const points = [...(history.data ?? [])]
    .sort((a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime())
    .map((rate) => ({ at: formatDateTime(rate.asOf), rate: Number(rate.rate) }));
  const rate = latest.data;

  return (
    <Stack>
      <PageHeader
        title="FX rates"
        actions={
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={() => {
              refresh.mutate();
            }}
            loading={refresh.isPending}
          >
            Refresh now
          </Button>
        }
      />
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Latest rate
          </Text>
          {rate === undefined ? (
            <Text c="dimmed">—</Text>
          ) : (
            <Group gap="xs">
              <Text fw={700} size="xl" ff="monospace">
                1 {rate.base} = {rate.rate} {rate.quote}
              </Text>
              {rate.stale && (
                <Badge color="orange" variant="filled">
                  stale
                </Badge>
              )}
            </Group>
          )}
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            As of
          </Text>
          <Text fw={600}>{formatDateTime(rate?.asOf)}</Text>
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Source
          </Text>
          <Text fw={600}>{rate?.source ?? '—'}</Text>
          <Text size="xs" c="dimmed">
            Refreshed every 15 minutes; the last stored rate is used (flagged stale) when the
            provider is unreachable.
          </Text>
        </Card>
      </SimpleGrid>
      <Card withBorder>
        <Text fw={600} mb="sm">
          History
        </Text>
        {points.length === 0 ? (
          <Text c="dimmed">No rates stored yet.</Text>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="at" minTickGap={24} />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke={LINE_COLOR} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </Stack>
  );
}
