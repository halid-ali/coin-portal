import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { appVersion } from '../../core/app-version';
import { LanguageService } from '../../core/i18n/language.service';
import { Language } from '../../core/i18n/languages';
import { LanguagePreference } from '../../core/settings/language-preference';
import { LanguageSelect } from '../../shared/language-select/language-select';

/**
 * Site footer: logo on the left, copyright and the privacy/terms/contact links in the middle, language on
 * the right; the content
 * lines up with the navbar (same max width and padding). Sticks to the bottom from sm up; on
 * phones it stays at the end of the page, so it does not take screen space (same as the navbar).
 */
@Component({
  selector: 'app-footer',
  imports: [RouterLink, TranslocoPipe, LanguageSelect],
  host: {
    // The page's footer landmark (the host is the element in the page, not a <footer>)
    role: 'contentinfo',
    class:
      'z-30 block border-t border-shade-200/80 bg-shade-0/85 backdrop-blur supports-backdrop-filter:bg-shade-0/70 sm:sticky sm:bottom-0',
  },
  template: `
    <div
      class="page-container grid grid-cols-2 items-center gap-x-6 gap-y-2 py-3 sm:grid-cols-[1fr_auto_1fr]"
    >
      <a routerLink="/" class="flex items-center gap-2 justify-self-start font-bold text-shade-900">
        <span
          aria-hidden="true"
          class="grid size-8 place-items-center rounded-full bg-linear-to-br from-amber-300 to-amber-500 text-sm
                 text-amber-950 shadow-sm ring-1 ring-amber-600/20"
          >€</span
        >
        CoinVitrine
      </a>

      <p
        class="order-last col-span-2 text-center text-xs text-shade-500 sm:order-none sm:col-span-1"
      >
        © {{ year }} CoinVitrine
        @if (version) {
          <span class="text-shade-500">· v{{ version }}</span>
        }
        ·
        <a routerLink="/privacy" class="hover:text-shade-800 hover:underline">{{
          'legal.privacyLink' | transloco
        }}</a>
        ·
        <a routerLink="/terms" class="hover:text-shade-800 hover:underline">{{
          'legal.termsLink' | transloco
        }}</a>
        ·
        <a routerLink="/contact" class="hover:text-shade-800 hover:underline">{{
          'legal.contactLink' | transloco
        }}</a>
      </p>

      <app-language-select
        class="justify-self-end"
        placement="top"
        align="end"
        [value]="language.current()"
        [label]="'nav.language' | transloco"
        (valueChange)="choose($event)"
      />

      @if (saveFailed()) {
        <p
          role="alert"
          class="order-last col-span-2 text-center text-xs text-danger-700 sm:col-span-3"
        >
          {{ 'settings.language.saveFailed' | transloco }}
        </p>
      }
    </div>
  `,
})
export class Footer {
  protected readonly language = inject(LanguageService);
  private readonly preference = inject(LanguagePreference);

  protected readonly year = new Date().getFullYear();
  // Shown only in release builds (see core/app-version.ts)
  protected readonly version = appVersion;

  /** The chosen language could not be saved to the account; hidden again after a while. */
  protected readonly saveFailed = signal(false);
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  protected async choose(lang: Language): Promise<void> {
    this.saveFailed.set(false);
    try {
      await this.preference.change(lang);
    } catch {
      // Not saved (e.g. offline): the language stays as it was, the dropdown shows it
      this.saveFailed.set(true);
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => this.saveFailed.set(false), 6000);
    }
  }
}
