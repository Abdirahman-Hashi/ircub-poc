import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { PermissionCode } from '@ircub/shared';

import * as authApi from '../api/auth.api';

import { setAccessToken } from './token-store';

import type { AuthContextValue, AuthStatus } from './auth.types';
import type { AuthUser, LoginResponse, RoleSummary, SessionResponse } from '../api/types';

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session state for the SPA (D5): the access token lives in memory, the refresh token in an
 * httpOnly cookie. On load we try one silent refresh; from then on `apiFetch` refreshes on
 * 401. Permissions come from the server with every session — never derived client-side.
 */
export function AuthProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<readonly RoleSummary[]>([]);
  const [permissions, setPermissions] = useState<ReadonlySet<PermissionCode>>(new Set());

  const applySession = useCallback((session: SessionResponse): void => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setPermissions(new Set(session.permissions));
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback((): void => {
    setAccessToken(null);
    setUser(null);
    setRoles([]);
    setPermissions(new Set());
    setStatus('anonymous');
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    const me = await authApi.getMe();
    setUser(me.user);
    setRoles(me.roles);
    setPermissions(new Set(me.permissions));
  }, []);

  useEffect(() => {
    let cancelled = false;
    authApi
      .refreshSession()
      .then(async (session) => {
        if (cancelled) {
          return;
        }
        applySession(session);
        await reload();
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession, reload]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      const result = await authApi.login(email, password);
      if (!result.mfaRequired && result.accessToken !== undefined && result.user !== undefined) {
        applySession({
          accessToken: result.accessToken,
          user: result.user,
          permissions: result.permissions ?? [],
        });
        await reload();
      }
      return result;
    },
    [applySession, reload],
  );

  const verifyMfa = useCallback(
    async (challengeToken: string, code: string): Promise<void> => {
      applySession(await authApi.verifyMfa(challengeToken, code));
      await reload();
    },
    [applySession, reload],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const can = useCallback((code: PermissionCode): boolean => permissions.has(code), [permissions]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, roles, permissions, can, login, verifyMfa, logout, reload }),
    [status, user, roles, permissions, can, login, verifyMfa, logout, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useCan(code: PermissionCode): boolean {
  return useAuth().can(code);
}
