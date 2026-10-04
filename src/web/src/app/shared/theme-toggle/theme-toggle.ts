import { Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { ThemePreference } from '../../core/settings/theme-preference';
import { ThemeService } from '../../core/theme/theme.service';

/**
 * Navbar button that switches between light and dark. The icon shows the theme it switches to
 * (moon in light, sun in dark). From System it switches to the opposite of what is shown; going
 * back to System is done in Settings > Appearance.
 */
@Component({
  selector: 'app-theme-toggle',
  imports: [TranslocoPipe],
  template: `
    <button
      type="button"
      class="rounded-lg p-2 text-shade-600 transition-colors hover:bg-shade-100 hover:text-shade-900
             focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
      [attr.aria-label]="labelKey() | transloco"
      [attr.title]="labelKey() | transloco"
      (click)="toggle()"
    >
      <svg
        viewBox="0 0 24 24"
        class="size-5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        @if (dark()) {
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
          />
        } @else {
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
        }
      </svg>
    </button>
  `,
})
export class ThemeToggle {
  private readonly theme = inject(ThemeService);
  private readonly preference = inject(ThemePreference);

  protected readonly dark = computed(() => this.theme.current() === 'dark');
  protected readonly labelKey = computed(() => (this.dark() ? 'theme.toLight' : 'theme.toDark'));

  protected async toggle(): Promise<void> {
    try {
      await this.preference.change(this.dark() ? 'Light' : 'Dark');
    } catch {
      // Not saved (e.g. offline): the theme switched back, the icon shows it
    }
  }
}
