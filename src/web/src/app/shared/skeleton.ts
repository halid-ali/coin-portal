import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, of, switchMap, timer } from 'rxjs';

/**
 * How long a load runs before its placeholder shapes (`.skeleton` in styles.css) replace the content
 * (user choice 2026-10-10): a quick answer swaps the content without the shapes flashing in between.
 */
export const SKELETON_DELAY_MS = 300;

/**
 * True once `loading` has stayed true for the delay, false again as soon as it ends. Called in an
 * injection context (a field initializer).
 */
export function delayedLoading(
  loading: Signal<boolean>,
  delayMs = SKELETON_DELAY_MS,
): Signal<boolean> {
  return toSignal(
    toObservable(loading).pipe(
      switchMap((on) => (on ? timer(delayMs).pipe(map(() => true)) : of(false))),
    ),
    { initialValue: false },
  );
}
