import { randomUUID } from 'node:crypto';

import { API } from '@ircub/shared';

import { requestContextStorage } from './request-context.storage';

import type { NextFunction, Request, Response } from 'express';

/**
 * Reuses the client's `x-request-id` or generates one, echoes it on the response and opens
 * the AsyncLocalStorage context for the rest of the request. Registered with `app.use()`
 * in app.setup.ts so it runs before the HTTP logger and every Nest middleware.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(API.REQUEST_ID_HEADER);
  const requestId = incoming !== undefined && incoming.length > 0 ? incoming : randomUUID();

  req.headers[API.REQUEST_ID_HEADER] = requestId;
  res.setHeader(API.REQUEST_ID_HEADER, requestId);

  requestContextStorage.run({ requestId }, () => {
    next();
  });
}
