import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { DEFAULT_LANGUAGE, Language, isLanguage, matchBrowserLanguage } from './languages';

const STORAGE_KEY = 'coinportal.language';

/**
 * The active UI language. Which one is used, in order: the account's saved choice (applied by
 * the app initializer and AuthService), this browser's last choice, the browser language,
 * English. Every switch is also remembered on this browser, so it survives signing out.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  private readonly active = signal<Language>(DEFAULT_LANGUAGE);

  /** Read it in computed()s and templates that format text themselves (e.g. Intl). */
  readonly current = this.active.asReadonly();

  /** The language this browser would pick for an anonymous visitor. */
  deviceLanguage(): Language {
    const saved = readStorage();
    if (isLanguage(saved)) {
      return saved;
    }
    return matchBrowserLanguage(navigator.languages ?? [navigator.language]) ?? DEFAULT_LANGUAGE;
  }

  /**
   * Loads the translations first, so the UI never shows raw keys, then switches. On a load
   * error (e.g. offline) the current language stays.
   */
  async use(lang: Language): Promise<void> {
    try {
      await firstValueFrom(this.transloco.load(lang));
    } catch (err) {
      console.warn(`Could not load the "${lang}" translations`, err);
      return;
    }
    this.transloco.setActiveLang(lang);
    this.active.set(lang);
    this.document.documentElement.lang = lang;
    writeStorage(lang);
  }
}

// Storage can be unavailable (privacy settings); the choice is then only kept for the session
function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignored, see readStorage
  }
}
