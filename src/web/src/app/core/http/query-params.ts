/** What withComponentInputBinding() binds for a query param: a repeated one arrives as an array. */
export type QueryParamInput = string | string[] | null | undefined;

/**
 * Input transform for query params: `?search=a&search=b` keeps the first value instead of handing
 * an array to code that expects a string (`.trim()` would throw and stop the list from loading).
 */
export function firstQueryParam(value: QueryParamInput): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? undefined;
}
