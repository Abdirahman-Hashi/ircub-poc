import { PASSWORD_VIOLATION } from './auth.constants';
import {
  afterFailedLogin,
  afterSuccessfulLogin,
  generateTemporaryPassword,
  isLocked,
  isPasswordStale,
  validatePasswordPolicy,
} from './password.rules';

const policy = { minLength: 10 };

describe('validatePasswordPolicy', () => {
  it('accepts a compliant password', () => {
    expect(validatePasswordPolicy('Passw0rd!2026', policy)).toEqual([]);
  });

  it('rejects a password shorter than the minimum', () => {
    expect(validatePasswordPolicy('Ab1!', policy)).toContain(PASSWORD_VIOLATION.TOO_SHORT);
  });

  it('requires an uppercase letter', () => {
    expect(validatePasswordPolicy('passw0rd!2026', policy)).toEqual([
      PASSWORD_VIOLATION.NO_UPPERCASE,
    ]);
  });

  it('requires a lowercase letter', () => {
    expect(validatePasswordPolicy('PASSW0RD!2026', policy)).toEqual([
      PASSWORD_VIOLATION.NO_LOWERCASE,
    ]);
  });

  it('requires a digit', () => {
    expect(validatePasswordPolicy('Password!!!!', policy)).toEqual([PASSWORD_VIOLATION.NO_DIGIT]);
  });

  it('requires a symbol', () => {
    expect(validatePasswordPolicy('Password2026', policy)).toEqual([PASSWORD_VIOLATION.NO_SYMBOL]);
  });

  it('reports every violation at once', () => {
    expect(validatePasswordPolicy('aaaa', policy)).toHaveLength(4);
  });
});

describe('lockout', () => {
  const lockout = { maxFailedAttempts: 5, lockoutMinutes: 15 };
  const now = new Date('2026-10-21T10:00:00Z');

  it('counts failures below the limit without locking', () => {
    const state = afterFailedLogin({ failedLoginCount: 3, lockedUntil: null }, lockout, now);
    expect(state).toEqual({ failedLoginCount: 4, lockedUntil: null });
  });

  it('locks for the configured minutes on the fifth failure and resets the counter', () => {
    const state = afterFailedLogin({ failedLoginCount: 4, lockedUntil: null }, lockout, now);
    expect(state.failedLoginCount).toBe(0);
    expect(state.lockedUntil).toEqual(new Date('2026-10-21T10:15:00Z'));
    expect(isLocked(state.lockedUntil, now)).toBe(true);
    expect(isLocked(state.lockedUntil, new Date('2026-10-21T10:16:00Z'))).toBe(false);
  });

  it('clears the state on success', () => {
    expect(afterSuccessfulLogin()).toEqual({ failedLoginCount: 0, lockedUntil: null });
  });
});

describe('isPasswordStale', () => {
  it('flags passwords older than the maximum age', () => {
    const now = new Date('2026-10-21T00:00:00Z');
    expect(isPasswordStale(new Date('2026-07-01T00:00:00Z'), 90, now)).toBe(true);
    expect(isPasswordStale(new Date('2026-09-01T00:00:00Z'), 90, now)).toBe(false);
  });
});

describe('generateTemporaryPassword', () => {
  it('always satisfies the policy', () => {
    let seed = 7;
    const randomInt = (max: number): number => {
      seed = (seed * 48271) % 2147483647;
      return seed % max;
    };
    for (let i = 0; i < 20; i += 1) {
      const password = generateTemporaryPassword(12, randomInt);
      expect(password).toHaveLength(12);
      expect(validatePasswordPolicy(password, policy)).toEqual([]);
    }
  });
});
