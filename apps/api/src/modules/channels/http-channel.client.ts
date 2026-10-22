import { HttpStatus, Logger } from '@nestjs/common';

import {
  CHANNEL,
  type ChannelInitiateRequest,
  type ChannelInitiateResponse,
  type ChannelStatusResponse,
  ErrorCode,
  type PaymentChannel,
} from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';

import { CHANNELS } from './channels.constants';
import { CHANNELS_MESSAGES } from './channels.messages';

import type { ChannelClient } from './channels.types';

const PERTURB_ON = '1';

/** HTTP implementation against the mock channel (`/bank` or `/momo`); network/5xx → CHANNEL_UNAVAILABLE. */
/** `fetch` wraps network errors as "fetch failed" with the real reason in `cause`. */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = error.cause;
  return cause instanceof Error ? `${error.message}: ${cause.message}` : error.message;
}

export class HttpChannelClient implements ChannelClient {
  private readonly logger: Logger;

  constructor(
    readonly channel: PaymentChannel,
    private readonly baseUrl: string,
    private readonly basePath: string,
  ) {
    this.logger = new Logger(`${HttpChannelClient.name}:${channel}`);
  }

  async initiate(request: ChannelInitiateRequest): Promise<ChannelInitiateResponse> {
    return this.call<ChannelInitiateResponse>(`${this.basePath}${CHANNEL.PAYMENTS_PATH}`, {
      method: 'POST',
      body: request,
    });
  }

  async status(txnRef: string): Promise<ChannelStatusResponse> {
    return this.call<ChannelStatusResponse>(
      `${this.basePath}${CHANNEL.PAYMENTS_PATH}/${encodeURIComponent(txnRef)}`,
      { method: 'GET' },
    );
  }

  async statement(date: string, perturb = false): Promise<string> {
    const query = new URLSearchParams({
      [CHANNEL.DATE_QUERY]: date,
      ...(perturb ? { [CHANNEL.PERTURB_QUERY]: PERTURB_ON } : {}),
    });
    return this.call<string>(`${this.basePath}${CHANNEL.STATEMENTS_PATH}?${query.toString()}`, {
      method: 'GET',
      text: true,
    });
  }

  private async call<T>(
    path: string,
    options: { method: 'GET' | 'POST'; body?: unknown; text?: boolean },
  ): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, '')}${path}`;
    try {
      const response = await fetch(url, {
        method: options.method,
        signal: AbortSignal.timeout(CHANNELS.TIMEOUT_MS),
        ...(options.body === undefined
          ? {}
          : {
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(options.body),
            }),
      });
      if (!response.ok) {
        throw new Error(`channel responded ${response.status}`);
      }
      return (options.text === true ? await response.text() : await response.json()) as T;
    } catch (error: unknown) {
      const message = describeError(error);
      this.logger.warn({ msg: 'channel call failed', channel: this.channel, url, error: message });
      throw new AppException(
        ErrorCode.CHANNEL_UNAVAILABLE,
        CHANNELS_MESSAGES.UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        { channel: this.channel, cause: message },
      );
    }
  }
}
