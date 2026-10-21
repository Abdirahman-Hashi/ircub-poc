import { Center, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { getHealth } from '../api/health.api';
import { QUERY_KEYS } from '../api/query-keys.constants';
import { HEALTH_POLL } from '../lib/api.constants';

import type { ReactElement, ReactNode } from 'react';

/**
 * Blocks the UI while `GET /health` fails. On the hosted demo the API cold-starts in
 * about a minute; polling here turns that into a clear message instead of broken screens.
 */
export function ApiWakingOverlay({ children }: { readonly children: ReactNode }): ReactElement {
  const health = useQuery({
    queryKey: QUERY_KEYS.health,
    queryFn: getHealth,
    retry: false,
    refetchInterval: (query) => (query.state.status === 'error' ? HEALTH_POLL.INTERVAL_MS : false),
  });

  if (health.isPending || health.isError) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="sm">
          <Loader />
          <Title order={3}>
            {health.isPending ? 'Connecting to the API…' : 'API is waking up…'}
          </Title>
          <Text c="dimmed" size="sm">
            {health.isError
              ? 'The hosted demo runs on a free tier and can take up to a minute to start. Retrying automatically.'
              : 'Checking service health.'}
          </Text>
        </Stack>
      </Center>
    );
  }

  return <>{children}</>;
}
