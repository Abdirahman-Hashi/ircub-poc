import { Text, type TextProps } from '@mantine/core';

import { formatMoney } from '../lib/format';

import type { ReactElement } from 'react';

/** Every money value on screen goes through here (apps/web/CLAUDE.md). */
export function MoneyText({
  amount,
  currency,
  ...props
}: { readonly amount: string | number; readonly currency: string } & TextProps): ReactElement {
  return (
    <Text ff="monospace" ta="right" {...props}>
      {formatMoney(amount, currency)}
    </Text>
  );
}
