import { Button, Stack, Text, Title } from '@mantine/core';
import { Link } from '@tanstack/react-router';

import { ROUTES } from '../../app/routes.constants';

import type { ReactElement } from 'react';

export function ForbiddenPage(): ReactElement {
  return (
    <Stack align="flex-start" gap="xs">
      <Title order={2}>403 — Not allowed</Title>
      <Text c="dimmed">Your roles do not include the permission needed for that screen.</Text>
      <Button component={Link} to={ROUTES.HOME} variant="light">
        Back to home
      </Button>
    </Stack>
  );
}
