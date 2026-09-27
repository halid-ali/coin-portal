import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { Country } from './coin.models';

export interface CountryOption {
  code: string;
  /** Localized display name, e.g. "Almanya". */
  name: string;
}

/**
 * Loads the issuing countries once and keeps them for the app lifetime.
 * Names come from the browser (Intl.DisplayNames), not from the API.
 */
@Injectable({ providedIn: 'root' })
export class CountryService {
  private readonly http = inject(HttpClient);
  // Locale is fixed until the i18n step
  private readonly locale = 'tr';
  private readonly displayNames = new Intl.DisplayNames([this.locale], { type: 'region' });

  private readonly options = signal<CountryOption[]>([]);
  private requested = false;

  /** Sorted by localized name. Empty until load() completes. */
  readonly countries = this.options.asReadonly();

  load(): void {
    if (this.requested) {
      return;
    }
    this.requested = true;

    this.http.get<Country[]>('/api/countries').subscribe({
      next: (list) =>
        this.options.set(
          list
            .map((c) => ({ code: c.code, name: this.name(c.code) }))
            .sort((a, b) => a.name.localeCompare(b.name, this.locale)),
        ),
      // Allow a retry on the next call
      error: () => (this.requested = false),
    });
  }

  name(code: string): string {
    try {
      return this.displayNames.of(code) ?? code;
    } catch {
      return code;
    }
  }
}