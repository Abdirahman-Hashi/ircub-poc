import { Button, Card, Center, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';

import type { ReactElement } from 'react';

/** Placeholder; phase 1 adds the form schema, mutation, MFA challenge and redirects. */
export function LoginPage(): ReactElement {
  return (
    <Center h="100vh">
      <Card withBorder w={360} p="lg">
        <Stack>
          <Title order={3}>Sign in to IRCUB</Title>
          <TextInput label="Email" placeholder="you@ircub.test" disabled />
          <PasswordInput label="Password" disabled />
          <Button disabled>Sign in</Button>
          <Text size="xs" c="dimmed">
            Authentication is implemented in phase 1.
          </Text>
        </Stack>
      </Card>
    </Center>
  );
}
