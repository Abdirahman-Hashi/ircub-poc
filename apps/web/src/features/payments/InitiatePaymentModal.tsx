import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';

import { Currency, PaymentChannel } from '@ircub/shared';

import { getLatestRate } from '../../api/fx.api';
import { initiateMyPayment, initiatePayment, lookupControlNumber } from '../../api/payments.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { MoneyText } from '../../components/MoneyText';
import { notifyError, notifySuccess } from '../../lib/notify';

import { LOCAL_CURRENCY, ONLINE_CHANNELS } from './payments.constants';
import { previewLocalAmount } from './payments.rules';

import type { InitiatePaymentModalProps, PayTarget } from './payments.types';

/**
 * Initiates a bank / mobile-money payment (brief Module 5). Officers look a control number
 * up here; the customer portal passes a pre-resolved `target` because customers cannot look
 * up arbitrary control numbers. The converted amount shown is a preview: the API converts
 * again with its stored rate when it creates the payment.
 */
export function InitiatePaymentModal(props: InitiatePaymentModalProps): ReactElement {
  // Mantine unmounts the modal body when closed, so the form starts clean on every open.
  return (
    <Modal opened={props.opened} onClose={props.onClose} title="Pay online" size="lg">
      <InitiateForm {...props} />
    </Modal>
  );
}

function InitiateForm({
  onClose,
  portal,
  target,
  onInitiated,
}: InitiatePaymentModalProps): ReactElement {
  const [controlNumber, setControlNumber] = useState(target?.controlNumber ?? '');
  const [resolved, setResolved] = useState<PayTarget | null>(target ?? null);
  const [amount, setAmount] = useState(target?.outstanding ?? '');
  const [currency, setCurrency] = useState<Currency>(Currency.SOS);
  const [channel, setChannel] = useState<PaymentChannel>(PaymentChannel.BANK);
  const [payerPhone, setPayerPhone] = useState('');
  const [demoFail, setDemoFail] = useState(false);
  const rate = useQuery({ queryKey: QUERY_KEYS.fxLatest, queryFn: getLatestRate });

  const lookup = useMutation({
    mutationFn: () => lookupControlNumber(controlNumber),
    onSuccess: (result) => {
      setResolved({
        controlNumber: result.controlNumber,
        description: `${result.payer.name} · ${result.description}`,
        outstanding: result.outstanding,
        currency: result.currency,
      });
      setAmount(result.outstanding);
    },
    onError: notifyError,
  });

  const initiate = useMutation({
    mutationFn: () => {
      const input = {
        controlNumber: resolved?.controlNumber ?? '',
        amount,
        currency,
        channel,
        ...(payerPhone.length > 0 ? { payerPhone } : {}),
      };
      return portal ? initiateMyPayment(input) : initiatePayment(input);
    },
    onSuccess: (payment) => {
      notifySuccess(
        `Payment ${payment.channelTxnRef ?? ''} sent to ${payment.channel}; awaiting confirmation`,
      );
      onInitiated?.(payment);
      onClose();
    },
    onError: notifyError,
  });

  const rateValue = rate.data?.rate ?? null;
  const preview = previewLocalAmount(amount, currency, LOCAL_CURRENCY, rateValue);

  return (
    <Stack>
      {!portal && (
        <Group align="flex-end">
          <TextInput
            label="Control number"
            placeholder="12 digits"
            value={controlNumber}
            onChange={(e) => {
              setControlNumber(e.currentTarget.value);
            }}
            style={{ flex: 1 }}
          />
          <Button
            variant="light"
            onClick={() => {
              lookup.mutate();
            }}
            loading={lookup.isPending}
            disabled={controlNumber.length === 0}
          >
            Look up
          </Button>
        </Group>
      )}
      {resolved !== null && (
        <Alert color="blue">
          <Text fw={600}>{resolved.description}</Text>
          <Group mt="xs">
            <Text size="sm">Outstanding:</Text>
            <MoneyText amount={resolved.outstanding} currency={resolved.currency} fw={700} />
          </Group>
        </Alert>
      )}
      {resolved !== null && (
        <>
          <Group grow>
            <Select
              label="Channel"
              data={[...ONLINE_CHANNELS]}
              value={channel}
              onChange={(v) => {
                setChannel((v as PaymentChannel | null) ?? PaymentChannel.BANK);
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
            <TextInput
              label="Amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.currentTarget.value);
              }}
            />
          </Group>
          {channel === PaymentChannel.MOBILE_MONEY && (
            <TextInput
              label="Mobile money number"
              placeholder="+2526…"
              value={payerPhone}
              onChange={(e) => {
                setPayerPhone(e.currentTarget.value);
              }}
            />
          )}
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">
                Will be applied as
              </Text>
              {preview === null ? (
                <Text c="dimmed">—</Text>
              ) : (
                <MoneyText amount={preview} currency={LOCAL_CURRENCY} fw={700} ta="left" />
              )}
            </div>
            {currency !== LOCAL_CURRENCY && rate.data !== undefined && (
              <Group gap="xs">
                <Text size="sm">
                  1 {rate.data.base} = {rate.data.rate} {rate.data.quote}
                </Text>
                {rate.data.stale && (
                  <Badge color="orange" variant="light">
                    stale rate
                  </Badge>
                )}
              </Group>
            )}
          </Group>
          {!portal && (
            <Checkbox
              label="Demo: simulate a declined payment (amount ending .99)"
              checked={demoFail}
              onChange={(e) => {
                const on = e.currentTarget.checked;
                setDemoFail(on);
                if (on) {
                  setAmount(`${amount.split('.')[0] ?? '0'}.99`);
                }
              }}
            />
          )}
          <Button
            onClick={() => {
              initiate.mutate();
            }}
            loading={initiate.isPending}
            disabled={amount.length === 0 || preview === null}
          >
            Send to {channel.replace(/_/g, ' ').toLowerCase()}
          </Button>
        </>
      )}
    </Stack>
  );
}
