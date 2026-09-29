import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

/** Mirrors CoinPortal.Api ThemePreference. System follows the device setting. */
export type ThemeMode = 'System' | 'Light' | 'Dark';

export const THEME_MODES: readonly ThemeMode[] = ['Light', 'Dark', 'System'];

/** The theme actually shown. */
export type Theme = 'light' | 'dark';

/** Also read by the inline script in index.html, which sets the class before Angular starts. */
const STORAGE_KEY = 'coinportal.theme';

/**
 * The active color theme. Which one is used, in order: the account's saved choice (applied by
 * the app initializer and AuthService), this browser's last choice, System. Every switch is also
 * remembered on this browser, so it survives signing out. The theme is shown by the `dark` class
 * on <html> (see the dark variant and color tokens in styles.css).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly mode = signal<ThemeMode>(readStorage() ?? 'System');
  private readonly systemDark = signal(false);

  /** What the user chose; System until they choose. */
  readonly preference = this.mode.asReadonly();

  readonly current = computed<Theme>(() => {
    const mode = this.mode();
    return mode === 'Dark' || (mode === 'System' && this.systemDark()) ? 'dark' : 'light';
  });

  constructor() {
    const view = this.document.defaultView;
    // Missing in tests (jsdom) and very old browsers: System is then light
    if (typeof view?.matchMedia === 'function') {
      const query = view.matchMedia('(prefers-color-scheme: dark)');
      this.systemDark.set(query.matches);
      query.addEventListener('change', (e) => this.systemDark.set(e.matches));
    }
    effect(() => {
      const dark = this.current() === 'dark';
      this.document.documentElement.classList.toggle('dark', dark);
    });
  }

  use(mode: ThemeMode): void {
    this.mode.set(mode);
    writeStorage(mode);
  }
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode);
}

// Storage can be unavailable (privacy settings); the choice is then only kept for the session
function readStorage(): ThemeMode | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isThemeMode(saved) ? saved : null;
  } catch {
    return null;
  }
}

function writeStorage(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignored, see readStorage
  }
}
