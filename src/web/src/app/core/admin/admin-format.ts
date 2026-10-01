// Formatting for the admin panel, in the UI language and the device's time zone. Pure functions,
// so callers pass LanguageService.current() and templates re-render when it changes.

/** Short date and time, e.g. "1 Eki 2026 14:05". */
export function formatDateTime(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/** Short date, e.g. "1 Eki 2026". */
export function formatDate(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(iso));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "now", "5 minutes ago", "yesterday", "3 months ago" … in the given language. */
export function formatRelative(iso: string, lang: string, now: number = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  if (abs < MINUTE) {
    return rtf.format(0, 'second');
  }
  if (abs < HOUR) {
    return rtf.format(Math.round(diff / MINUTE), 'minute');
  }
  if (abs < DAY) {
    return rtf.format(Math.round(diff / HOUR), 'hour');
  }
  if (abs < 30 * DAY) {
    return rtf.format(Math.round(diff / DAY), 'day');
  }
  if (abs < 365 * DAY) {
    return rtf.format(Math.round(diff / (30 * DAY)), 'month');
  }
  return rtf.format(Math.round(diff / (365 * DAY)), 'year');
}

const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;

/** Binary steps with the usual short units: "512 B", "1,5 MB", "2 GB". */
export function formatBytes(bytes: number, lang: string): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return new Intl.NumberFormat(lang, {
    style: 'unit',
    unit: BYTE_UNITS[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
}
