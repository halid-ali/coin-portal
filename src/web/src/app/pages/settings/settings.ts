import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Sections in menu order; each is a child route (settings.routes.ts). New ones (security, …)
 * are added here and there.
 */
const SECTIONS: readonly { path: string; labelKey: string; icon: string }[] = [
  { path: 'profile', labelKey: 'settings.profile.nav', icon: 'profile' },
  { path: 'appearance', labelKey: 'settings.appearance.nav', icon: 'appearance' },
  { path: 'account', labelKey: 'settings.account.nav', icon: 'account' },
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
      <h1 class="mb-6 text-2xl font-semibold text-shade-900">{{ 'settings.title' | transloco }}</h1>

      <div class="grid gap-6 md:grid-cols-[13rem_1fr]">
        <!-- min-w-0: the tab row scrolls inside instead of widening the page (phones, long languages) -->
        <nav class="min-w-0" [attr.aria-label]="'settings.sections' | transloco">
          <!-- The padding keeps the active/focus ring inside the scroll box, which clips it -->
          <ul class="-m-1 flex gap-1 overflow-x-auto p-1 md:flex-col">
            @for (section of sections; track section.path) {
              <li>
                <a
                  [routerLink]="section.path"
                  routerLinkActive="!bg-brand-50 !text-brand-800 ring-1 ring-brand-200"
                  ariaCurrentWhenActive="page"
                  class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap
                         text-shade-600 transition-colors hover:bg-shade-100 hover:text-shade-900
                         focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
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
                      @case ('profile') {
                        <!-- person -->
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21a8 8 0 0 1 16 0" />
                      }
                      @case ('appearance') {
                        <!-- palette -->
                        <path
                          d="M12 3a9 9 0 0 0 0 18c1.1 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2z"
                        />
                        <circle cx="7.5" cy="11" r="1" />
                        <circle cx="10" cy="7" r="1" />
                        <circle cx="14.5" cy="7" r="1" />
                      }
                      @case ('account') {
                        <!-- shield with a key hole: the account itself -->
                        <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6z" />
                        <circle cx="12" cy="11" r="1.6" />
                        <path d="M12 12.6V15" />
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
