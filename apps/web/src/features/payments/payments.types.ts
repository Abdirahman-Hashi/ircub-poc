import type { Currency } from '@ircub/shared';

import type { PaymentView } from '../../api/types';

/** What the initiation dialog needs to know about the thing being paid. */
export interface PayTarget {
  readonly controlNumber: string;
  readonly description: string;
  readonly outstanding: string;
  readonly currency: Currency;
}

export interface InitiatePaymentModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly portal: boolean;
  readonly target?: PayTarget | null;
  readonly onInitiated?: (payment: PaymentView) => void;
}

export interface LiveStatusNotice {
  readonly color: string;
  readonly message: string;
}
