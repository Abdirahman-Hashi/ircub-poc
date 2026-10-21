import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedUser, RequestWithUser } from './auth.types';

/** Injects the authenticated user (`{ id, email }`) into a handler parameter. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined =>
    context.switchToHttp().getRequest<RequestWithUser>().user,
);
