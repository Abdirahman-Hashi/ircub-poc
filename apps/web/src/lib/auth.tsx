import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { PermissionCode } from '@ircub/shared';

import { setAccessToken } from './token-store';

import type { AuthContextValue, AuthUser } from './auth.types';

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Phase 0 stub: no user, every permission granted, so the shell renders fully for the
 * scaffold. Phase 1 replaces the internals with the real login / refresh / MFA flow while
 * keeping this hook contract, so components never change.
 */
export function AuthProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [user] = useState<AuthUser | null>(null);

  const can = useCallback((_code: PermissionCode): boolean => true, []);
  const logout = useCallback((): Promise<void> => {
    setAccessToken(null);
    return Promise.resolve();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, can, logout }),
    [user, can, logout],
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
