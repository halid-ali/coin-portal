import { cachedIntl } from './intl-cache';

const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;

/**
 * Binary steps with the usual short units: "512 B", "1,5 MB", "2 GB". A pure function: callers
 * pass LanguageService.current(), so templates re-render when it changes.
 */
export function formatBytes(bytes: number, lang: string): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return cachedIntl(
    `bytes|${lang}|${unit}`,
    () =>
      new Intl.NumberFormat(lang, {
        style: 'unit',
        unit: BYTE_UNITS[unit],
        unitDisplay: 'short',
        maximumFractionDigits: unit === 0 ? 0 : 1,
      }),
  ).format(value);
}
