import { Badge, Button, Card, Group, ScrollArea, Stack, Text } from '@mantine/core';

import { formatDateTime } from '../../lib/format';

import { DEFAULT_SEVERITY_COLOR, SEVERITY_COLORS } from './dashboard.constants';

import type { AlertView } from '../../api/types';
import type { ReactElement } from 'react';

const PANEL_HEIGHT = 320;

/** Presentational alerts list: severity badge, text, acknowledge. Data arrives from the page. */
export function AlertsPanel({
  alerts,
  onAcknowledge,
  acknowledging,
  canAcknowledge,
}: {
  readonly alerts: readonly AlertView[];
  readonly onAcknowledge: (id: string) => void;
  readonly acknowledging: boolean;
  readonly canAcknowledge: boolean;
}): ReactElement {
  return (
    <Card withBorder h="100%">
      <Group justify="space-between" mb="sm">
        <Text fw={600}>Alerts</Text>
        <Badge variant="light" color={alerts.length === 0 ? 'teal' : 'orange'}>
          {alerts.length} open
        </Badge>
      </Group>
      <ScrollArea h={PANEL_HEIGHT}>
        {alerts.length === 0 ? (
          <Text c="dimmed" size="sm">
            No open alerts.
          </Text>
        ) : (
          <Stack gap="xs">
            {alerts.map((alert) => (
              <Card key={alert.id} withBorder padding="sm" data-testid="alert-row">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div>
                    <Group gap="xs">
                      <Badge
                        color={SEVERITY_COLORS[alert.severity] ?? DEFAULT_SEVERITY_COLOR}
                        variant="filled"
                        size="sm"
                      >
                        {alert.severity}
                      </Badge>
                      <Text fw={600} size="sm">
                        {alert.title}
                      </Text>
                    </Group>
                    <Text size="sm">{alert.message}</Text>
                    <Text size="xs" c="dimmed">
                      {alert.type.replace(/_/g, ' ')} · {formatDateTime(alert.createdAt)}
                    </Text>
                  </div>
                  {canAcknowledge && (
                    <Button
                      size="xs"
                      variant="light"
                      loading={acknowledging}
                      onClick={() => {
                        onAcknowledge(alert.id);
                      }}
                    >
                      Acknowledge
                    </Button>
                  )}
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Card>
  );
}
