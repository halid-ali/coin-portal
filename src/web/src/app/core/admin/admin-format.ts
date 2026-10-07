// Formatting for the admin panel, in the UI language and the device's time zone. Pure functions,
// so callers pass LanguageService.current() and templates re-render when it changes.

import { cachedIntl } from '../i18n/intl-cache';

// Byte sizes are shown outside the panel too (Settings > Account)
export { formatBytes } from '../i18n/format-bytes';

/** Short date and time, e.g. "1 Eki 2026 14:05". */
export function formatDateTime(iso: string, lang: string): string {
  return cachedIntl(
    `dateTime|${lang}`,
    () => new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }),
  ).format(new Date(iso));
}

/** Short date, e.g. "1 Eki 2026". */
export function formatDate(iso: string, lang: string): string {
  return cachedIntl(
    `date|${lang}`,
    () => new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }),
  ).format(new Date(iso));
}

/** Grouped number, e.g. "1.234". */
export function formatNumber(value: number, lang: string): string {
  return cachedIntl(`number|${lang}`, () => new Intl.NumberFormat(lang)).format(value);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "now", "5 minutes ago", "yesterday", "3 months ago" … in the given language. */
export function formatRelative(iso: string, lang: string, now: number = Date.now()): string {
  const rtf = cachedIntl(
    `relative|${lang}`,
    () => new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }),
  );
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
