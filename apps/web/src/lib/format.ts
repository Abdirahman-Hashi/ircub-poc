const LOCALE = 'en-KE';
const MONEY_FRACTION_DIGITS = 2;
const DATE_PREFIX_LENGTH = 10;

/** Money arrives as a decimal string (D9); format with thousands separators and 2 dp. */
export function formatMoney(amount: string | number, currency: string): string {
  const value = typeof amount === 'number' ? amount : Number(amount);
  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: MONEY_FRACTION_DIGITS,
    maximumFractionDigits: MONEY_FRACTION_DIGITS,
  }).format(Number.isFinite(value) ? value : 0);
  return `${currency} ${formatted}`;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' }).format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

/** `2026-10-21T…` → `2026-10-21` for date inputs. */
export function toDateInput(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return new Date(value).toISOString().slice(0, DATE_PREFIX_LENGTH);
}
