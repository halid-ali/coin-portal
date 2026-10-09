import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { translate } from '@jsverse/transloco';

import { LanguageService } from '../i18n/language.service';
import { Country } from './coin.models';

export interface CountryOption {
  code: string;
  /** Display name in the active language, e.g. "Germany". */
  name: string;
}

/**
 * Former countries that issued coins. Browsers map their codes to today's countries (SU → Russia,
 * DD → Germany), so their names are ours: country.former.<code>.
 */
export const FORMER_COUNTRY_CODES: readonly string[] = ['SU', 'DD', 'YU', 'CS'];

/**
 * Loads the countries once and keeps them for the app lifetime: every country a coin can come from,
 * the euro issuers marked. Names come from the browser (Intl.DisplayNames) in the active language,
 * not from the API; former countries from the translations.
 */
@Injectable({ providedIn: 'root' })
export class CountryService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);

  private readonly displayNames = computed(
    () => new Intl.DisplayNames([this.language.current()], { type: 'region' }),
  );
  private readonly list = signal<Country[]>([]);
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
  readonly countries = computed<CountryOption[]>(() => this.options(this.list()));

  /** The euro issuers only (a euro coin comes from one of them), sorted the same way. */
  readonly euroCountries = computed<CountryOption[]>(() =>
    this.options(this.list().filter((c) => c.euroIssuer)),
  );

  private options(list: Country[]): CountryOption[] {
    const lang = this.language.current();
    return list
      .map((c) => ({ code: c.code, name: this.name(c.code) }))
      .sort((a, b) => a.name.localeCompare(b.name, lang));
  }

  load(): void {
    if (this.requested) {
      return;
    }
    this.requested = true;

    this.http.get<Country[]>('/api/countries').subscribe({
      next: (list) => {
        this.list.set(list);
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
    if (FORMER_COUNTRY_CODES.includes(code)) {
      // The language is switched only once its translations are loaded
      this.language.current();
      return translate('country.former.' + code);
    }
    try {
      return this.displayNames().of(code) ?? code;
    } catch {
      return code;
    }
  }
}
