import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode, FMIS } from '@ircub/shared';
import type { FmisJournalRequest, FmisJournalResponse, FmisLedgerResponse } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { AppConfigService } from '../../config/app-config.service';

import { FMIS_API } from './fmis.constants';
import { FMIS_MESSAGES } from './fmis.messages';

import type { FmisClient } from './fmis.types';

/** Status ranges as plain numbers so the comparison is not an enum comparison. */
const CLIENT_ERROR_MIN: number = HttpStatus.BAD_REQUEST;
const SERVER_ERROR_MIN: number = HttpStatus.INTERNAL_SERVER_ERROR;

function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = error.cause;
  return cause instanceof Error ? `${error.message}: ${cause.message}` : error.message;
}

/** HTTP implementation against the mock FMIS; a 4xx is a rejection, anything else is unavailability. */
@Injectable()
export class HttpFmisClient implements FmisClient {
  private readonly logger = new Logger(HttpFmisClient.name);

  constructor(private readonly config: AppConfigService) {}

  async postJournal(
    request: FmisJournalRequest,
    forceFailure = false,
  ): Promise<FmisJournalResponse> {
    const query = forceFailure ? `?${FMIS.FAIL_QUERY}=${FMIS.FAIL_ON}` : '';
    return this.call<FmisJournalResponse>(`${FMIS.JOURNALS_PATH}${query}`, request);
  }

  async ledger(date: string): Promise<FmisLedgerResponse> {
    const query = new URLSearchParams({ [FMIS.DATE_QUERY]: date });
    return this.call<FmisLedgerResponse>(`${FMIS.LEDGER_PATH}?${query.toString()}`);
  }

  private async call<T>(path: string, body?: FmisJournalRequest): Promise<T> {
    const url = `${this.config.mocksBaseUrl.replace(/\/$/, '')}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: body === undefined ? 'GET' : 'POST',
        signal: AbortSignal.timeout(FMIS_API.TIMEOUT_MS),
        ...(body === undefined
          ? {}
          : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
      });
    } catch (error: unknown) {
      const message = describeError(error);
      this.logger.warn({ msg: 'fmis call failed', url, error: message });
      throw new AppException(
        ErrorCode.FMIS_UNAVAILABLE,
        FMIS_MESSAGES.FMIS_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        { cause: message },
      );
    }
    if (response.status >= CLIENT_ERROR_MIN && response.status < SERVER_ERROR_MIN) {
      const detail = await response.text();
      throw new AppException(
        ErrorCode.JOURNAL_UNBALANCED,
        FMIS_MESSAGES.FMIS_REJECTED,
        HttpStatus.UNPROCESSABLE_ENTITY,
        { status: response.status, detail },
      );
    }
    if (!response.ok) {
      throw new AppException(
        ErrorCode.FMIS_UNAVAILABLE,
        FMIS_MESSAGES.FMIS_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        { status: response.status },
      );
    }
    return (await response.json()) as T;
  }
}
