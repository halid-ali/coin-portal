const cache = new Map<string, unknown>();

/**
 * One Intl object per kind, language and options: building one is slow, using it is cheap, and
 * templates format on every change detection (per row, in both the card and the table copy).
 * The key must name everything that changes the result, e.g. "dateTime|tr".
 */
export function cachedIntl<T>(key: string, create: () => T): T {
  let value = cache.get(key) as T | undefined;
  if (value === undefined) {
    value = create();
    cache.set(key, value);
  }
  return value;
}
