import { Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { LanguageService } from '../../core/i18n/language.service';
import { Language } from '../../core/i18n/languages';
import { LanguagePreference } from '../../core/settings/language-preference';
import { LanguageSelect } from '../../shared/language-select/language-select';

/**
 * Settings > Appearance > Language. The dropdown shows the active language (the saved one, otherwise the one
 * this device picked). A choice is saved to the account right away (no save button) and then
 * applied, so the page switches to the new language.
 */
@Component({
  selector: 'app-language-settings',
  imports: [TranslocoPipe, LanguageSelect],
  template: `
    <div class="card space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-shade-900">
          {{ 'settings.language.title' | transloco }}
        </h2>
        <p class="mt-1 text-sm text-shade-600">{{ 'settings.language.description' | transloco }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <app-language-select
          [value]="language.current()"
          [label]="'settings.language.title' | transloco"
          (valueChange)="choose($event)"
        />
        <span aria-live="polite">
          @if (status() === 'saved') {
            <span class="text-sm text-success-700"
              >✓ {{ 'settings.language.saved' | transloco }}</span
            >
          }
        </span>
      </div>

      @if (status() === 'failed') {
        <p class="alert-error" role="alert">{{ 'settings.language.saveFailed' | transloco }}</p>
      }
    </div>
  `,
})
export class LanguageSettings {
  protected readonly language = inject(LanguageService);
  private readonly preference = inject(LanguagePreference);

  protected readonly status = signal<'saved' | 'failed' | null>(null);

  protected async choose(lang: Language): Promise<void> {
    this.status.set(null);
    try {
      await this.preference.change(lang);
      this.status.set('saved');
    } catch {
      this.status.set('failed');
    }
  }
}
