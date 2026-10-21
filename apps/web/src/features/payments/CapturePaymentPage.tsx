import { Alert, Button, Card, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { useNavigate } from '@tanstack/react-router';
import { type ReactElement, useState } from 'react';

import { Currency, PaymentChannel } from '@ircub/shared';

import { capturePayment, lookupControlNumber } from '../../api/payments.api';
import { ROUTES } from '../../app/routes.constants';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { notifyError, notifySuccess } from '../../lib/notify';

import type { ControlNumberLookup } from '../../api/types';

const MANUAL_CHANNELS = [PaymentChannel.CASH, PaymentChannel.BANK, PaymentChannel.MOBILE_MONEY];

export function CapturePaymentPage(): ReactElement {
  const navigate = useNavigate();
  const [controlNumber, setControlNumber] = useState('');
  const [lookup, setLookup] = useState<ControlNumberLookup | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.SOS);
  const [channel, setChannel] = useState<PaymentChannel>(PaymentChannel.CASH);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  const find = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await lookupControlNumber(controlNumber);
      setLookup(result);
      setAmount(result.outstanding);
    } catch (caught: unknown) {
      setLookup(null);
      notifyError(caught);
    } finally {
      setBusy(false);
    }
  };

  const capture = async (): Promise<void> => {
    if (lookup === null) {
      return;
    }
    setBusy(true);
    try {
      const payment = await capturePayment({
        controlNumber: lookup.controlNumber,
        amount,
        currency,
        channel,
        ...(reference.length > 0 ? { channelTxnRef: reference } : {}),
      });
      notifySuccess(`Captured ${payment.localAmount} (local) against ${payment.controlNumber}`);
      await navigate({ to: ROUTES.PAYMENTS });
    } catch (caught: unknown) {
      notifyError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack maw={640}>
      <PageHeader title="Capture payment" />
      <Card withBorder>
        <Stack>
          <Group align="flex-end">
            <TextInput
              label="Control number"
              placeholder="12 digits"
              value={controlNumber}
              onChange={(e) => {
                setControlNumber(e.currentTarget.value);
              }}
              style={{ flex: 1 }}
              onKeyDown={(e) => e.key === 'Enter' && void find()}
            />
            <Button
              onClick={() => void find()}
              loading={busy}
              disabled={controlNumber.length === 0}
            >
              Look up
            </Button>
          </Group>
          {lookup !== null && (
            <Alert color="blue">
              <Group justify="space-between">
                <div>
                  <Text fw={600}>{lookup.payer.name}</Text>
                  <Text size="sm">
                    {lookup.payer.tin} · {lookup.description}
                  </Text>
                </div>
                <StatusBadge status={lookup.status} />
              </Group>
              <Group mt="xs">
                <Text size="sm">Outstanding:</Text>
                <MoneyText amount={lookup.outstanding} currency={lookup.currency} fw={700} />
              </Group>
            </Alert>
          )}
          {lookup !== null && (
            <>
              <Group grow>
                <TextInput
                  label="Amount"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.currentTarget.value);
                  }}
                />
                <Select
                  label="Currency"
                  data={Object.values(Currency)}
                  value={currency}
                  onChange={(v) => {
                    setCurrency((v as Currency | null) ?? Currency.SOS);
                  }}
                />
                <Select
                  label="Channel"
                  data={MANUAL_CHANNELS}
                  value={channel}
                  onChange={(v) => {
                    setChannel((v as PaymentChannel | null) ?? PaymentChannel.CASH);
                  }}
                />
              </Group>
              {channel !== PaymentChannel.CASH && (
                <TextInput
                  label="Channel reference"
                  placeholder="Bank or mobile-money transaction reference"
                  value={reference}
                  onChange={(e) => {
                    setReference(e.currentTarget.value);
                  }}
                />
              )}
              <Text size="xs" c="dimmed">
                Foreign-currency amounts are converted at the latest stored rate; over-payments are
                rejected.
              </Text>
              <Button onClick={() => void capture()} loading={busy} disabled={amount.length === 0}>
                Capture payment
              </Button>
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
