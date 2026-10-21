import { CONTROL_NUMBER, TIN, WATER_ACCOUNT_NUMBER } from '@ircub/shared';

import { IDS } from './ids.constants';

import type { RandomDigit } from './ids.types';

const DIGITS_ONLY = /^[0-9]+$/;

/**
 * TIN = `TIN` + 9 digits + 1 mod-11 check digit (D10). Weighted sum with weights 10..2 over
 * the body; check = (11 − sum mod 11) mod 11. Bodies that would need check digit 10 are
 * rejected by the generator, so a TIN is always `TIN` followed by 10 digits.
 */
export function computeTinCheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) {
    const digit = Number(body.charAt(i));
    sum += digit * (IDS.TIN_MAX_WEIGHT - i);
  }
  return (TIN.CHECK_MODULUS - (sum % TIN.CHECK_MODULUS)) % TIN.CHECK_MODULUS;
}

export function isTinBodyIssuable(body: string): boolean {
  return (
    body.length === TIN.BODY_DIGITS &&
    DIGITS_ONLY.test(body) &&
    computeTinCheckDigit(body) !== IDS.TIN_UNREPRESENTABLE_CHECK
  );
}

export function formatTin(body: string): string {
  return `${TIN.PREFIX}${body}${computeTinCheckDigit(body)}`;
}

export function isValidTin(tin: string): boolean {
  if (!tin.startsWith(TIN.PREFIX)) {
    return false;
  }
  const digits = tin.slice(TIN.PREFIX.length);
  if (digits.length !== TIN.BODY_DIGITS + TIN.CHECK_DIGITS || !DIGITS_ONLY.test(digits)) {
    return false;
  }
  const body = digits.slice(0, TIN.BODY_DIGITS);
  const check = Number(digits.slice(TIN.BODY_DIGITS));
  return isTinBodyIssuable(body) && computeTinCheckDigit(body) === check;
}

/** Random body that is issuable; `randomDigit` returns 0–9. */
export function generateTinBody(randomDigit: RandomDigit): string {
  for (;;) {
    let body = '';
    for (let i = 0; i < TIN.BODY_DIGITS; i += 1) {
      body += String(randomDigit());
    }
    if (isTinBodyIssuable(body)) {
      return body;
    }
  }
}

/**
 * Control number = 10-digit sequence body + 2 check digits (ISO 7064 MOD 97-10, as in IBANs):
 * check = 98 − (body × 100 mod 97); a number is valid when the whole 12 digits mod 97 = 1.
 */
export function computeControlCheck(body: string): string {
  const shifted = BigInt(body) * BigInt(IDS.MOD97_SHIFT);
  const check = BigInt(IDS.MOD97_COMPLEMENT) - (shifted % BigInt(CONTROL_NUMBER.CHECK_MODULUS));
  return check.toString().padStart(CONTROL_NUMBER.CHECK_DIGITS, '0');
}

export function formatControlNumber(sequence: bigint): string {
  const bodyLength = CONTROL_NUMBER.LENGTH - CONTROL_NUMBER.CHECK_DIGITS;
  const body = sequence.toString().padStart(bodyLength, '0');
  if (body.length !== bodyLength) {
    throw new RangeError(`control number sequence ${sequence} exceeds ${bodyLength} digits`);
  }
  return `${body}${computeControlCheck(body)}`;
}

export function isValidControlNumber(value: string): boolean {
  if (value.length !== CONTROL_NUMBER.LENGTH || !DIGITS_ONLY.test(value)) {
    return false;
  }
  return BigInt(value) % BigInt(CONTROL_NUMBER.CHECK_MODULUS) === BigInt(IDS.MOD97_VALID_REMAINDER);
}

/** Accepts user input with spaces or dashes (`1234 5678 9012`) and returns the bare digits. */
export function normaliseControlNumber(input: string): string {
  return input.replace(/[\s-]/g, '');
}

/** Water account number = `WA` + 8 digits (D10); random body, uniqueness checked by the service. */
export function generateWaterAccountBody(randomDigit: RandomDigit): string {
  let body = '';
  for (let i = 0; i < WATER_ACCOUNT_NUMBER.BODY_DIGITS; i += 1) {
    body += String(randomDigit());
  }
  return body;
}

export function formatWaterAccountNumber(body: string): string {
  return `${WATER_ACCOUNT_NUMBER.PREFIX}${body}`;
}

export function isValidWaterAccountNumber(value: string): boolean {
  return (
    value.startsWith(WATER_ACCOUNT_NUMBER.PREFIX) &&
    value.length === WATER_ACCOUNT_NUMBER.PREFIX.length + WATER_ACCOUNT_NUMBER.BODY_DIGITS &&
    DIGITS_ONLY.test(value.slice(WATER_ACCOUNT_NUMBER.PREFIX.length))
  );
}
