import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { LanguageService } from '../i18n/language.service';
import { Country } from './coin.models';

export interface CountryOption {
  code: string;
  /** Display name in the active language, e.g. "Germany". */
  name: string;
}

/**
 * Loads the issuing countries once and keeps them for the app lifetime.
 * Names come from the browser (Intl.DisplayNames) in the active language, not from the API.
 */
@Injectable({ providedIn: 'root' })
export class CountryService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);

  private readonly displayNames = computed(
    () => new Intl.DisplayNames([this.language.current()], { type: 'region' }),
  );
  private readonly codes = signal<string[]>([]);
  private requested = false;

  /**
   * True once the list has arrived or failed (then countries stays empty). A coin list sorted by
   * country order waits for it, instead of asking twice (without, then with the order).
   */
  readonly settled = signal(false);

  /**
   * Sorted by display name in the active language; re-sorted when the language changes (the
   * coin list sends this order to the API). Empty until load() completes.
   */
  readonly countries = computed<CountryOption[]>(() => {
    const lang = this.language.current();
    return this.codes()
      .map((code) => ({ code, name: this.name(code) }))
      .sort((a, b) => a.name.localeCompare(b.name, lang));
  });

  load(): void {
    if (this.requested) {
      return;
    }
    this.requested = true;

    this.http.get<Country[]>('/api/countries').subscribe({
      next: (list) => {
        this.codes.set(list.map((c) => c.code));
        this.settled.set(true);
      },
      error: () => {
        // Allow a retry on the next call
        this.requested = false;
        this.settled.set(true);
      },
    });
  }

  /** Reads the active language, so templates and computed()s calling it follow a switch. */
  name(code: string): string {
    try {
      return this.displayNames().of(code) ?? code;
    } catch {
      return code;
    }
  }
}
