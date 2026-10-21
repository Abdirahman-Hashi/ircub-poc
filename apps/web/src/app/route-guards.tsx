import { Center, Loader } from '@mantine/core';
import { Navigate, Outlet } from '@tanstack/react-router';

import type { PermissionCode } from '@ircub/shared';

import { useAuth } from '../lib/auth';

import { ROUTES } from './routes.constants';

import type { ReactElement } from 'react';

/** Layout guard: unauthenticated visitors go to /login; the session is restored first. */
export function RequireAuth(): ReactElement {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  if (status === 'anonymous') {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return <Outlet />;
}

/** Page guard: the UI hides what the user cannot do, the server still enforces it. */
export function RequirePermission({
  permission,
  children,
}: {
  readonly permission: PermissionCode;
  readonly children: ReactElement;
}): ReactElement {
  const { can } = useAuth();
  return can(permission) ? children : <Navigate to={ROUTES.FORBIDDEN} replace />;
}
