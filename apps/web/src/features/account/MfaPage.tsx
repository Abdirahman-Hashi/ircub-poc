import {
  Alert,
  Button,
  Card,
  Code,
  Group,
  Image,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { toDataURL } from 'qrcode';
import { type ReactElement, useState } from 'react';

import { confirmMfa, disableMfa, enrolMfa } from '../../api/auth.api';
import { useAuth } from '../../lib/auth';
import { notifyError, notifySuccess } from '../../lib/notify';

import type { MfaEnrolResponse } from '../../api/types';

export function MfaPage(): ReactElement {
  const { user, reload } = useAuth();
  const [enrolment, setEnrolment] = useState<MfaEnrolResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    try {
      await action();
    } catch (caught: unknown) {
      notifyError(caught);
    } finally {
      setBusy(false);
    }
  };

  const startEnrolment = (): Promise<void> =>
    run(async () => {
      const result = await enrolMfa();
      setEnrolment(result);
      setQrDataUrl(await toDataURL(result.otpauthUrl));
    });

  const confirm = (): Promise<void> =>
    run(async () => {
      await confirmMfa(code);
      await reload();
      setEnrolment(null);
      setQrDataUrl(null);
      setCode('');
      notifySuccess('Two-factor authentication enabled.');
    });

  const disable = (): Promise<void> =>
    run(async () => {
      await disableMfa(password);
      await reload();
      setPassword('');
      notifySuccess('Two-factor authentication disabled.');
    });

  return (
    <Stack maw={520}>
      <Title order={2}>Two-factor authentication</Title>
      {user?.mfaEnabled === true ? (
        <Card withBorder>
          <Stack>
            <Alert color="teal">Two-factor authentication is enabled on your account.</Alert>
            <PasswordInput
              label="Confirm your password to disable"
              value={password}
              onChange={(event) => {
                setPassword(event.currentTarget.value);
              }}
            />
            <Button
              color="red"
              variant="light"
              onClick={() => void disable()}
              loading={busy}
              disabled={password.length === 0}
            >
              Disable
            </Button>
          </Stack>
        </Card>
      ) : enrolment === null ? (
        <Card withBorder>
          <Stack>
            <Text>
              Add a time-based one-time code (TOTP) from an authenticator app as a second factor.
            </Text>
            <Button onClick={() => void startEnrolment()} loading={busy}>
              Start enrolment
            </Button>
          </Stack>
        </Card>
      ) : (
        <Card withBorder>
          <Stack>
            <Text>
              Scan this QR code with your authenticator app, then enter the code it shows.
            </Text>
            {qrDataUrl !== null && <Image src={qrDataUrl} w={200} alt="TOTP QR code" />}
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Manual key:
              </Text>
              <Code>{enrolment.secret}</Code>
            </Group>
            <TextInput
              label="Code"
              inputMode="numeric"
              value={code}
              onChange={(event) => {
                setCode(event.currentTarget.value);
              }}
            />
            <Button onClick={() => void confirm()} loading={busy} disabled={code.length === 0}>
              Confirm and enable
            </Button>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
