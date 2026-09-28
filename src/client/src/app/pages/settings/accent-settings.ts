import { Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { AccentPreference } from '../../core/settings/accent-preference';
import { ACCENT_COLORS, AccentColor, AccentService } from '../../core/theme/accent.service';

/**
 * Each swatch shows its color's primary button fill (see the accent blocks in styles.css), with
 * the check mark in the fill's text color. Plain palette classes on purpose, literal strings so
 * Tailwind finds them.
 */
const SWATCH: Record<AccentColor, string> = {
  Amber: 'bg-amber-500 text-amber-950',
  Teal: 'bg-teal-500 text-teal-950',
  Blue: 'bg-blue-600 text-white',
  Indigo: 'bg-indigo-600 text-white',
  Violet: 'bg-violet-600 text-white',
  Rose: 'bg-rose-600 text-white',
  Lime: 'bg-lime-400 text-lime-950',
};

/**
 * Settings > Appearance > Accent color: round swatches as radio buttons. A choice is applied
 * and saved to the account right away.
 */
@Component({
  selector: 'app-accent-settings',
  imports: [TranslocoPipe],
  template: `
    <div class="card space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-shade-900">
          {{ 'settings.accent.title' | transloco }}
        </h2>
        <p class="mt-1 text-sm text-shade-600">{{ 'settings.accent.description' | transloco }}</p>
      </div>

      <fieldset class="@container">
        <legend class="sr-only">{{ 'settings.accent.title' | transloco }}</legend>
        <!-- One row when the card is wide enough, otherwise 4 + 3 (never 6 + 1 or 5 + 2) -->
        <div class="grid max-w-lg grid-cols-4 gap-x-1 gap-y-4 @min-[30rem]:grid-cols-7">
          @for (color of colors; track color) {
            <label
              class="group flex min-w-0 cursor-pointer flex-col items-center gap-2 has-disabled:cursor-wait"
            >
              <input
                type="radio"
                name="accent"
                class="peer sr-only"
                [checked]="accent.current() === color"
                [disabled]="saving()"
                (change)="choose(color)"
              />
              <span
                class="grid size-10 place-items-center rounded-full shadow-sm ring-2 ring-transparent
                       ring-offset-2 transition-shadow group-hover:ring-shade-300
                       peer-checked:ring-shade-900 peer-focus-visible:ring-brand-500"
                [class]="swatches[color]"
                aria-hidden="true"
              >
                @if (accent.current() === color) {
                  <svg
                    viewBox="0 0 24 24"
                    class="size-5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                }
              </span>
              <span
                class="text-center text-xs font-medium text-shade-600 peer-checked:text-shade-900"
              >
                {{ 'theme.accent.' + color | transloco }}
              </span>
            </label>
          }
        </div>
      </fieldset>

      <p aria-live="polite" class="min-h-5">
        @if (status() === 'saved') {
          <span class="text-sm text-success-700">✓ {{ 'settings.accent.saved' | transloco }}</span>
        }
      </p>

      @if (status() === 'failed') {
        <p class="alert-error" role="alert">{{ 'settings.accent.saveFailed' | transloco }}</p>
      }
    </div>
  `,
})
export class AccentSettings {
  protected readonly accent = inject(AccentService);
  private readonly preference = inject(AccentPreference);

  protected readonly colors = ACCENT_COLORS;
  protected readonly swatches = SWATCH;
  protected readonly saving = signal(false);
  protected readonly status = signal<'saved' | 'failed' | null>(null);

  protected async choose(color: AccentColor): Promise<void> {
    this.saving.set(true);
    this.status.set(null);
    try {
      await this.preference.change(color);
      this.status.set('saved');
    } catch {
      this.status.set('failed');
    } finally {
      this.saving.set(false);
    }
  }
}
