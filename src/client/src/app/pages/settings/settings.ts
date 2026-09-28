import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Sections in menu order; each is a child route (settings.routes.ts). New ones (appearance,
 * security, …) are added here and there.
 */
const SECTIONS: readonly { path: string; labelKey: string; icon: string }[] = [
  { path: 'language', labelKey: 'settings.language.nav', icon: 'language' },
];

/**
 * Settings page (/settings): the section menu on the left (a horizontal tab row on narrow
 * screens), the chosen section on the right.
 */
@Component({
  selector: 'app-settings',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  template: `
    <section>
      <h1 class="mb-6 text-2xl font-semibold text-slate-900">{{ 'settings.title' | transloco }}</h1>

      <div class="grid gap-6 md:grid-cols-[13rem_1fr]">
        <nav [attr.aria-label]="'settings.sections' | transloco">
          <ul class="flex gap-1 overflow-x-auto md:flex-col">
            @for (section of sections; track section.path) {
              <li>
                <a
                  [routerLink]="section.path"
                  routerLinkActive="!bg-amber-50 !text-amber-800 ring-1 ring-amber-200"
                  ariaCurrentWhenActive="page"
                  class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap
                         text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900
                         focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="size-4.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    @switch (section.icon) {
                      @case ('language') {
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                      }
                    }
                  </svg>
                  {{ section.labelKey | transloco }}
                </a>
              </li>
            }
          </ul>
        </nav>

        <div class="min-w-0">
          <router-outlet />
        </div>
      </div>
    </section>
  `,
})
export class Settings {
  protected readonly sections = SECTIONS;
}
