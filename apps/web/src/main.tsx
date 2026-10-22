import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-react-table/styles.css';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { router } from './app/router';
import { ApiWakingOverlay } from './components/ApiWakingOverlay';
import { AuthProvider } from './lib/auth';
import { LiveEventsProvider } from './lib/live-events';
import { theme } from './theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <QueryClientProvider client={queryClient}>
        <ApiWakingOverlay>
          <AuthProvider>
            <LiveEventsProvider>
              <RouterProvider router={router} />
            </LiveEventsProvider>
          </AuthProvider>
        </ApiWakingOverlay>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
