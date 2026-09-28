import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { LanguageService } from '../../core/i18n/language.service';
import { Language } from '../../core/i18n/languages';
import { LanguagePreference } from '../../core/settings/language-preference';
import { LanguageSelect } from '../../shared/language-select/language-select';

/**
 * Site footer: logo on the left, copyright in the middle, language on the right; the content
 * lines up with the navbar (same max width and padding). Sticks to the bottom from sm up; on
 * phones it stays at the end of the page, so it does not take screen space (same as the navbar).
 */
@Component({
  selector: 'app-footer',
  imports: [RouterLink, TranslocoPipe, LanguageSelect],
  host: {
    class:
      'z-30 block border-t border-slate-200/80 bg-white/85 backdrop-blur supports-backdrop-filter:bg-white/70 sm:sticky sm:bottom-0',
  },
  template: `
    <div
      class="mx-auto grid max-w-5xl grid-cols-2 items-center gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_auto_1fr]"
    >
      <a routerLink="/" class="flex items-center gap-2 justify-self-start font-bold text-slate-900">
        <span
          aria-hidden="true"
          class="grid size-8 place-items-center rounded-full bg-linear-to-br from-amber-300 to-amber-500 text-sm
                 text-amber-950 shadow-sm ring-1 ring-amber-600/20"
          >€</span
        >
        Coin Portal
      </a>

      <p
        class="order-last col-span-2 text-center text-xs text-slate-500 sm:order-none sm:col-span-1"
      >
        © {{ year }} Coin Portal
      </p>

      <app-language-select
        class="justify-self-end"
        placement="top"
        align="end"
        [value]="language.current()"
        [label]="'nav.language' | transloco"
        (valueChange)="choose($event)"
      />
    </div>
  `,
})
export class Footer {
  protected readonly language = inject(LanguageService);
  private readonly preference = inject(LanguagePreference);

  protected readonly year = new Date().getFullYear();

  protected async choose(lang: Language): Promise<void> {
    try {
      await this.preference.change(lang);
    } catch {
      // Not saved (e.g. offline): the language stays as it was, the dropdown shows it
    }
  }
}
