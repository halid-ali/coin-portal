import { Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

import { ThemePreference } from '../../core/settings/theme-preference';
import { THEME_MODES, ThemeMode, ThemeService } from '../../core/theme/theme.service';

/**
 * Plain palette classes on purpose: each preview shows its theme, whatever the active one is.
 * Literal strings, so Tailwind finds them.
 */
const PREVIEW = {
  light: {
    page: 'bg-slate-100',
    surface: 'bg-white',
    text: 'bg-slate-400',
    line: 'bg-slate-200',
  },
  dark: {
    page: 'bg-slate-950',
    surface: 'bg-slate-800',
    text: 'bg-slate-400',
    line: 'bg-slate-600',
  },
} as const;

/**
 * Settings > Appearance > Theme: Light, Dark and System as radio cards with a small preview
 * (System shows both halves). A choice is applied and saved to the account right away.
 */
@Component({
  selector: 'app-theme-settings',
  imports: [NgTemplateOutlet, TranslocoPipe],
  template: `
    <div class="card space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-shade-900">
          {{ 'settings.theme.title' | transloco }}
        </h2>
        <p class="mt-1 text-sm text-shade-600">{{ 'settings.theme.description' | transloco }}</p>
      </div>

      <fieldset>
        <legend class="sr-only">{{ 'settings.theme.title' | transloco }}</legend>
        <div class="grid max-w-lg grid-cols-3 gap-3 sm:gap-4">
          @for (mode of modes; track mode) {
            <label class="group cursor-pointer">
              <input
                type="radio"
                name="theme"
                class="peer sr-only"
                [checked]="theme.preference() === mode"
                (change)="choose(mode)"
              />
              <span
                class="relative block aspect-4/3 overflow-hidden rounded-lg ring-1 ring-shade-200
                       transition-shadow group-hover:ring-shade-300 peer-checked:ring-2
                       peer-checked:ring-brand-500 peer-focus-visible:ring-2
                       peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2"
                aria-hidden="true"
              >
                @if (mode === 'System') {
                  <ng-container
                    *ngTemplateOutlet="preview; context: { $implicit: previews.light }"
                  />
                  <span class="absolute inset-0 [clip-path:inset(0_0_0_50%)]">
                    <ng-container
                      *ngTemplateOutlet="preview; context: { $implicit: previews.dark }"
                    />
                  </span>
                } @else {
                  <ng-container
                    *ngTemplateOutlet="
                      preview;
                      context: { $implicit: mode === 'Dark' ? previews.dark : previews.light }
                    "
                  />
                }
              </span>
              <span
                class="mt-2 flex items-center gap-1.5 text-sm font-medium text-shade-700
                       peer-checked:text-shade-900"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="size-4 shrink-0 text-brand-600"
                  [class.invisible]="theme.preference() !== mode"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 5 5 9-10" />
                </svg>
                {{ 'theme.mode.' + mode | transloco }}
              </span>
            </label>
          }
        </div>
      </fieldset>

      <p aria-live="polite" class="min-h-5">
        @if (status() === 'saved') {
          <span class="text-sm text-success-700">✓ {{ 'settings.theme.saved' | transloco }}</span>
        }
      </p>

      @if (status() === 'failed') {
        <p class="alert-error" role="alert">{{ 'settings.theme.saveFailed' | transloco }}</p>
      }
    </div>

    <!-- A tiny page: navbar with the logo, then a card with text lines and a button -->
    <ng-template #preview let-c>
      <span class="flex h-full flex-col gap-1.5 p-2" [class]="c.page">
        <span class="flex h-3 shrink-0 items-center gap-1 rounded-sm px-1" [class]="c.surface">
          <span class="size-1.5 rounded-full bg-amber-400"></span>
          <span class="h-1 w-5 rounded-full" [class]="c.line"></span>
        </span>
        <span class="flex flex-1 flex-col gap-1 rounded-sm p-1.5" [class]="c.surface">
          <span class="h-1.5 w-3/4 rounded-full" [class]="c.text"></span>
          <span class="h-1.5 w-1/2 rounded-full" [class]="c.line"></span>
          <span class="h-1.5 w-2/3 rounded-full" [class]="c.line"></span>
          <span class="mt-auto h-2.5 w-7 rounded-sm bg-primary"></span>
        </span>
      </span>
    </ng-template>
  `,
})
export class ThemeSettings {
  protected readonly theme = inject(ThemeService);
  private readonly preference = inject(ThemePreference);

  protected readonly modes = THEME_MODES;
  protected readonly previews = PREVIEW;
  protected readonly status = signal<'saved' | 'failed' | null>(null);

  protected async choose(mode: ThemeMode): Promise<void> {
    this.status.set(null);
    try {
      await this.preference.change(mode);
      this.status.set('saved');
    } catch {
      this.status.set('failed');
    }
  }
}
