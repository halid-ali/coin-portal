import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../../core/coins/coin.models';

// Query parameter values of the coin list -> API values. Anything a user may have typed into the
// address falls back to the default instead of reaching the API.

/** A whole number, or undefined (missing, "abc", "2.5"). */
export function toInt(value: string | undefined): number | undefined {
  const n = Number(value);
  return value && Number.isInteger(n) ? n : undefined;
}

/** Photo filter: "missing" (without the photos a public collection needs) / "complete" / all. */
export function toPhotographed(value: string | undefined): boolean | undefined {
  return value === 'missing' ? false : value === 'complete' ? true : undefined;
}

/** "all" is 0 (every coin on one page); values not offered fall back to the default. */
export function toPageSize(value: string | undefined): number {
  if (value === 'all') {
    return 0;
  }
  const n = toInt(value);
  return n !== undefined && n !== 0 && PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
}
