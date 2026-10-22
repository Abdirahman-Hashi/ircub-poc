import { ActionIcon, Indicator } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { unacknowledgedAlertCount } from '../api/dashboard.api';
import { QUERY_KEYS } from '../api/query-keys.constants';
import { ROUTES } from '../app/routes.constants';
import { useLiveEvent } from '../lib/live-events';
import { LIVE_EVENT } from '../lib/live-events.constants';
import { notifyAlert } from '../lib/notify';

import type { ReactElement } from 'react';

const ICON_SIZE = 18;
const REFRESH_MS = 60_000;

/** Unacknowledged alert count for holders of `alerts.view`; a new alert also toasts. */
export function AlertsBell(): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const count = useQuery({
    queryKey: QUERY_KEYS.alertCount,
    queryFn: unacknowledgedAlertCount,
    refetchInterval: REFRESH_MS,
  });
  useLiveEvent((event) => {
    if (event.type === LIVE_EVENT.ALERT_CREATED) {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      notifyAlert(event.data.severity, event.data.title);
    }
  });
  const open = count.data?.count ?? 0;
  return (
    <Indicator label={open} size={16} color="red" disabled={open === 0}>
      <ActionIcon
        variant="subtle"
        color={open === 0 ? 'gray' : 'orange'}
        aria-label="Alerts"
        title="Open alerts"
        onClick={() => void navigate({ to: ROUTES.DASHBOARD })}
      >
        <IconAlertTriangle size={ICON_SIZE} />
      </ActionIcon>
    </Indicator>
  );
}
