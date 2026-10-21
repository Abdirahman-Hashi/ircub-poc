import { AUTH, PASSWORD_RULES, PASSWORD_VIOLATION, TEMP_PASSWORD_POOLS } from './auth.constants';

import type {
  LockoutPolicy,
  LockState,
  PasswordPolicy,
  PasswordViolation,
  RandomInt,
} from './auth.types';

/** Every rule of the password policy (D5) as a list of violations; empty = compliant. */
export function validatePasswordPolicy(
  password: string,
  policy: PasswordPolicy,
): PasswordViolation[] {
  const violations: PasswordViolation[] = [];
  if (password.length < policy.minLength) {
    violations.push(PASSWORD_VIOLATION.TOO_SHORT);
  }
  if (!PASSWORD_RULES.UPPER.test(password)) {
    violations.push(PASSWORD_VIOLATION.NO_UPPERCASE);
  }
  if (!PASSWORD_RULES.LOWER.test(password)) {
    violations.push(PASSWORD_VIOLATION.NO_LOWERCASE);
  }
  if (!PASSWORD_RULES.DIGIT.test(password)) {
    violations.push(PASSWORD_VIOLATION.NO_DIGIT);
  }
  if (!PASSWORD_RULES.SYMBOL.test(password)) {
    violations.push(PASSWORD_VIOLATION.NO_SYMBOL);
  }
  return violations;
}

export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

/**
 * State after one more failed login: the counter grows until it reaches the limit, at which
 * point the account locks for the configured minutes and the counter resets.
 */
export function afterFailedLogin(current: LockState, policy: LockoutPolicy, now: Date): LockState {
  const failedLoginCount = current.failedLoginCount + 1;
  if (failedLoginCount >= policy.maxFailedAttempts) {
    return {
      failedLoginCount: 0,
      lockedUntil: new Date(now.getTime() + policy.lockoutMinutes * AUTH.MS_PER_MINUTE),
    };
  }
  return { failedLoginCount, lockedUntil: current.lockedUntil };
}

export function afterSuccessfulLogin(): LockState {
  return { failedLoginCount: 0, lockedUntil: null };
}

/** Warn-only rule: password older than `maxAgeDays`. */
export function isPasswordStale(passwordChangedAt: Date, maxAgeDays: number, now: Date): boolean {
  return now.getTime() - passwordChangedAt.getTime() > maxAgeDays * AUTH.MS_PER_DAY;
}

/**
 * Builds a temporary password that satisfies the policy by construction: one character from
 * each class plus random filler, then shuffled. `randomInt` is injected for testability.
 */
export function generateTemporaryPassword(length: number, randomInt: RandomInt): string {
  const pools = [
    TEMP_PASSWORD_POOLS.UPPER,
    TEMP_PASSWORD_POOLS.LOWER,
    TEMP_PASSWORD_POOLS.DIGIT,
    TEMP_PASSWORD_POOLS.SYMBOL,
  ];
  const all = pools.join('');
  const chars = pools.map((pool) => pick(pool, randomInt));
  while (chars.length < length) {
    chars.push(pick(all, randomInt));
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const left = chars[i];
    const right = chars[j];
    if (left !== undefined && right !== undefined) {
      chars[i] = right;
      chars[j] = left;
    }
  }
  return chars.join('');
}

function pick(pool: string, randomInt: RandomInt): string {
  return pool.charAt(randomInt(pool.length));
}
