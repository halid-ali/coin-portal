import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

/** Mirrors CoinPortal.Api AccentColor. Order is the order in the settings. */
export const ACCENT_COLORS = ['Amber', 'Teal', 'Blue', 'Indigo', 'Violet', 'Rose', 'Lime'] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];

export const DEFAULT_ACCENT: AccentColor = 'Amber';

/** Also read by the inline script in index.html, which sets the attribute before Angular starts. */
const STORAGE_KEY = 'coinportal.accent';

/**
 * The active accent color (brand scale and primary button). Which one is used, in order: the
 * account's saved choice (applied by the app initializer and AuthService), this browser's last
 * choice, Amber. Shown by data-accent on <html> (see the accent blocks in styles.css); the
 * default has no attribute.
 */
@Injectable({ providedIn: 'root' })
export class AccentService {
  private readonly document = inject(DOCUMENT);

  private readonly accent = signal<AccentColor>(readStorage() ?? DEFAULT_ACCENT);

  readonly current = this.accent.asReadonly();

  constructor() {
    effect(() => {
      const accent = this.accent();
      const root = this.document.documentElement;
      if (accent === DEFAULT_ACCENT) {
        root.removeAttribute('data-accent');
      } else {
        root.setAttribute('data-accent', accent);
      }
    });
  }

  use(accent: AccentColor): void {
    this.accent.set(accent);
    writeStorage(accent);
  }
}

export function isAccentColor(value: unknown): value is AccentColor {
  return ACCENT_COLORS.includes(value as AccentColor);
}

// Storage can be unavailable (privacy settings); the choice is then only kept for the session
function readStorage(): AccentColor | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isAccentColor(saved) ? saved : null;
  } catch {
    return null;
  }
}

function writeStorage(accent: AccentColor): void {
  try {
    localStorage.setItem(STORAGE_KEY, accent);
  } catch {
    // Ignored, see readStorage
  }
}
