import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AlertSeverity, AlertType } from '@ircub/shared';

import { AlertsPanel } from './AlertsPanel';

const alert = {
  id: 'a1',
  type: AlertType.COLLECTION_DROP,
  severity: AlertSeverity.CRITICAL,
  title: 'Collections are below the trailing average',
  message: 'Collected 10 so far today against an expected 100.',
  data: {},
  createdAt: '2026-10-22T08:00:00.000Z',
  acknowledgedById: null,
  acknowledgedAt: null,
};

describe('AlertsPanel', () => {
  it('renders the severity badge and acknowledges on click', () => {
    const onAcknowledge = vi.fn();
    render(
      <MantineProvider>
        <AlertsPanel
          alerts={[alert]}
          onAcknowledge={onAcknowledge}
          acknowledging={false}
          canAcknowledge
        />
      </MantineProvider>,
    );
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('1 open')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(onAcknowledge).toHaveBeenCalledWith('a1');
  });

  it('hides the acknowledge button without the permission', () => {
    render(
      <MantineProvider>
        <AlertsPanel
          alerts={[alert]}
          onAcknowledge={vi.fn()}
          acknowledging={false}
          canAcknowledge={false}
        />
      </MantineProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
  });
});
