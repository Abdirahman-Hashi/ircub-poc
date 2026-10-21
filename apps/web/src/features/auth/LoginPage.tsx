import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  Center,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { Navigate, useNavigate } from '@tanstack/react-router';
import { type ReactElement, useState } from 'react';
import { useForm } from 'react-hook-form';

import { ROUTES } from '../../app/routes.constants';
import { ApiError } from '../../lib/api-error';
import { useAuth } from '../../lib/auth';

import { type LoginForm, loginSchema, type MfaForm, mfaSchema } from './login.schema';

export function LoginPage(): ReactElement {
  const { status, login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const mfaForm = useForm<MfaForm>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  });

  if (status === 'authenticated') {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  const onLogin = loginForm.handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await login(values.email, values.password);
      if (result.mfaRequired && result.challengeToken !== undefined) {
        setChallengeToken(result.challengeToken);
      } else {
        await navigate({ to: ROUTES.HOME });
      }
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Login failed');
    }
  });

  const onMfa = mfaForm.handleSubmit(async (values) => {
    setError(null);
    if (challengeToken === null) {
      return;
    }
    try {
      await verifyMfa(challengeToken, values.code);
      await navigate({ to: ROUTES.HOME });
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Verification failed');
    }
  });

  return (
    <Center h="100vh">
      <Card withBorder w={380} p="lg">
        {challengeToken === null ? (
          <form onSubmit={(event) => void onLogin(event)}>
            <Stack>
              <Title order={3}>Sign in to IRCUB</Title>
              {error !== null && <Alert color="red">{error}</Alert>}
              <TextInput
                label="Email"
                placeholder="you@ircub.test"
                autoComplete="username"
                {...loginForm.register('email')}
                error={loginForm.formState.errors.email?.message}
              />
              <PasswordInput
                label="Password"
                autoComplete="current-password"
                {...loginForm.register('password')}
                error={loginForm.formState.errors.password?.message}
              />
              <Button type="submit" loading={loginForm.formState.isSubmitting}>
                Sign in
              </Button>
            </Stack>
          </form>
        ) : (
          <form onSubmit={(event) => void onMfa(event)}>
            <Stack>
              <Title order={3}>Two-factor code</Title>
              <Text size="sm" c="dimmed">
                Enter the 6-digit code from your authenticator app.
              </Text>
              {error !== null && <Alert color="red">{error}</Alert>}
              <TextInput
                label="Code"
                inputMode="numeric"
                autoComplete="one-time-code"
                {...mfaForm.register('code')}
                error={mfaForm.formState.errors.code?.message}
              />
              <Button type="submit" loading={mfaForm.formState.isSubmitting}>
                Verify
              </Button>
              <Button
                variant="subtle"
                onClick={() => {
                  setChallengeToken(null);
                }}
              >
                Back
              </Button>
            </Stack>
          </form>
        )}
      </Card>
    </Center>
  );
}
