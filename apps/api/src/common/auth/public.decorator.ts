import { type CustomDecorator, SetMetadata } from '@nestjs/common';

import { AUTH_METADATA } from './auth.constants';

/** Marks a handler as reachable without a JWT (health, login, channel callbacks). */
export const Public = (): CustomDecorator => SetMetadata(AUTH_METADATA.IS_PUBLIC, true);
