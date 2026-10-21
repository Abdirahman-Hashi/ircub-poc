import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, List, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from 'react-hook-form';

import { changePassword } from '../../api/auth.api';
import { ApiError } from '../../lib/api-error';
import { notifyError, notifySuccess } from '../../lib/notify';

import { type ChangePasswordForm, changePasswordSchema } from './password.schema';

import type { ReactElement } from 'react';

export function ChangePasswordPage(): ReactElement {
  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      notifySuccess('Password changed. Other sessions have been signed out.');
      form.reset();
    } catch (caught: unknown) {
      const violations =
        caught instanceof ApiError
          ? (caught.details as { violations?: string[] } | undefined)?.violations
          : undefined;
      if (violations !== undefined) {
        form.setError('newPassword', { message: `Policy: ${violations.join(', ')}` });
      }
      notifyError(caught);
    }
  });

  return (
    <Stack maw={480}>
      <Title order={2}>Change password</Title>
      <Card withBorder>
        <form onSubmit={(event) => void onSubmit(event)}>
          <Stack>
            <PasswordInput
              label="Current password"
              autoComplete="current-password"
              {...form.register('currentPassword')}
              error={form.formState.errors.currentPassword?.message}
            />
            <PasswordInput
              label="New password"
              autoComplete="new-password"
              {...form.register('newPassword')}
              error={form.formState.errors.newPassword?.message}
            />
            <PasswordInput
              label="Confirm new password"
              autoComplete="new-password"
              {...form.register('confirmPassword')}
              error={form.formState.errors.confirmPassword?.message}
            />
            <Text size="sm" c="dimmed">
              Policy:
            </Text>
            <List size="sm" c="dimmed">
              <List.Item>At least the configured minimum length (default 10)</List.Item>
              <List.Item>Upper and lower case, a digit and a symbol</List.Item>
              <List.Item>Not one of your recent passwords</List.Item>
            </List>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Change password
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
