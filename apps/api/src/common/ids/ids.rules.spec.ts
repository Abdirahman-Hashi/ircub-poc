import {
  computeControlCheck,
  computeTinCheckDigit,
  formatControlNumber,
  formatTin,
  generateTinBody,
  isTinBodyIssuable,
  isValidControlNumber,
  isValidTin,
  normaliseControlNumber,
} from './ids.rules';

describe('TIN (mod-11)', () => {
  it('computes the check digit over weights 10..2', () => {
    // 1*10+2*9+3*8+4*7+5*6+6*5+7*4+8*3+9*2 = 210; 210 mod 11 = 1; check = 10 → not issuable
    expect(computeTinCheckDigit('123456789')).toBe(10);
    expect(isTinBodyIssuable('123456789')).toBe(false);
    // 000000001 → sum 2 → check 9
    expect(computeTinCheckDigit('000000001')).toBe(9);
    expect(formatTin('000000001')).toBe('TIN0000000019');
  });

  it('validates a well-formed TIN and rejects a bad check digit', () => {
    expect(isValidTin('TIN0000000019')).toBe(true);
    expect(isValidTin('TIN0000000018')).toBe(false);
    expect(isValidTin('TIN00000000')).toBe(false);
    expect(isValidTin('XYZ0000000019')).toBe(false);
    expect(isValidTin('TIN00000000a9')).toBe(false);
  });

  it('generates issuable bodies of the right length', () => {
    let n = 0;
    const digit = (): number => {
      n = (n * 7 + 3) % 10;
      return n;
    };
    for (let i = 0; i < 50; i += 1) {
      const body = generateTinBody(digit);
      expect(body).toHaveLength(9);
      expect(isValidTin(formatTin(body))).toBe(true);
    }
  });
});

describe('control number (mod-97)', () => {
  it('formats a sequence as 10 digits + 2 check digits that validate', () => {
    const value = formatControlNumber(BigInt(1));
    expect(value).toHaveLength(12);
    expect(value.startsWith('0000000001')).toBe(true);
    expect(isValidControlNumber(value)).toBe(true);
    expect(isValidControlNumber(formatControlNumber(BigInt(9_999_999_999)))).toBe(true);
  });

  it('rejects a transposed or altered digit', () => {
    const value = formatControlNumber(BigInt(123456));
    const altered = `${value.slice(0, 5)}${(Number(value.charAt(5)) + 1) % 10}${value.slice(6)}`;
    expect(isValidControlNumber(altered)).toBe(false);
    expect(isValidControlNumber('12345678901')).toBe(false);
    expect(isValidControlNumber('12345678901x')).toBe(false);
  });

  it('computes the IBAN-style complement', () => {
    expect(computeControlCheck('0000000001')).toBe('95');
  });

  it('refuses a sequence that overflows the body', () => {
    expect(() => formatControlNumber(BigInt(10_000_000_000))).toThrow(RangeError);
  });

  it('normalises user input', () => {
    expect(normaliseControlNumber('1234 5678-9012')).toBe('123456789012');
  });
});
