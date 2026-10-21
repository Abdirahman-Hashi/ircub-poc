import type { PaymentChannel } from '@ircub/shared';

/** `(channel, ref)` pairs are what the database keeps unique (D11); keep the same key in memory. */
export function txnRefKey(channel: PaymentChannel, ref: string): string {
  return `${channel}:${ref}`;
}

/** Stored path for an uploaded file: never the original name, which is attacker-controlled. */
export function storedFileName(uploadId: string): string {
  return `${uploadId}.csv`;
}
