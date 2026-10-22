/** Injection token for the client registry; tests register fakes. */
export const CHANNEL_CLIENTS = Symbol('CHANNEL_CLIENTS');

export const CHANNELS = {
  /** Outbound HTTP timeout to a channel (phase prompt: 10 s). */
  TIMEOUT_MS: 10_000,
  /** Path appended to API_PUBLIC_URL; the channel posts the signed callback here. */
  CALLBACK_PATH: '/payments/callback',
  CSV_DELIMITER: ',',
} as const;
