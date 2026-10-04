import { effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { debounceTime, filter, map } from 'rxjs';

/** Same limit as the API's list queries (`[StringLength(100)] Search`). */
export const SEARCH_MAX_LENGTH = 100;

/** Search term as it goes into the URL and to the API: trimmed and within the API limit. */
export function normalizeSearch(value: string | undefined): string {
  return (value ?? '').trim().slice(0, SEARCH_MAX_LENGTH).trim();
}

/**
 * Binds a search box to its query param; the URL stays the single source of truth. Call it in a
 * constructor (injection context).
 *
 * - Typing is debounced and compared with the URL's current value, not with the previous term:
 *   after "clear filters" or the back button changed the URL, typing the same term searches again.
 * - A URL change (back/forward, clear filters) rewrites the box only when the trimmed text
 *   differs, so a trailing space the user is typing ("2 " on the way to "2 euro") survives.
 */
export function syncSearchWithUrl(
  control: FormControl<string>,
  urlValue: () => string | undefined,
  apply: (search: string | null) => void,
): void {
  effect(() => {
    const value = normalizeSearch(urlValue());
    if (value !== normalizeSearch(control.value)) {
      control.setValue(value, { emitEvent: false });
    }
  });

  control.valueChanges
    .pipe(
      debounceTime(300),
      map(normalizeSearch),
      filter((value) => value !== normalizeSearch(urlValue())),
      takeUntilDestroyed(),
    )
    .subscribe((value) => apply(value || null));
}
