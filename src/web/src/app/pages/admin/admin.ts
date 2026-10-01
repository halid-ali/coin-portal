import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** Sections in menu order; each is a child route (admin.routes.ts). */
const SECTIONS: readonly { path: string; labelKey: string; icon: string }[] = [
  { path: 'overview', labelKey: 'admin.nav.overview', icon: 'overview' },
  { path: 'users', labelKey: 'admin.nav.users', icon: 'users' },
  { path: 'collections', labelKey: 'admin.nav.collections', icon: 'collections' },
  { path: 'audit', labelKey: 'admin.nav.audit', icon: 'audit' },
];

/**
 * The admin panel (/admin, Admin role only): moderation and operations. Same layout as the
 * settings page: the section menu on the left (a tab row on narrow screens), the section on the
 * right. Texts come from the "admin" translation scope (src/i18n/admin).
 */
@Component({
  selector: 'app-admin',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  template: `
    <section>
      <h1 class="mb-6 text-2xl font-semibold text-shade-900">{{ 'admin.title' | transloco }}</h1>

      <div class="grid gap-6 md:grid-cols-[13rem_1fr]">
        <nav class="min-w-0" [attr.aria-label]="'admin.sections' | transloco">
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
                         focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
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
                      @case ('overview') {
                        <!-- bar chart -->
                        <path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />
                      }
                      @case ('users') {
                        <!-- two people -->
                        <circle cx="9" cy="8" r="3.5" />
                        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a6.5 6.5 0 0 1 3.5 5.7" />
                      }
                      @case ('collections') {
                        <!-- stacked albums -->
                        <rect x="3" y="7" width="18" height="13" rx="2" />
                        <path d="M6 4h12" />
                      }
                      @case ('audit') {
                        <!-- clipboard with lines -->
                        <rect x="5" y="4" width="14" height="17" rx="2" />
                        <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
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
export class Admin {
  protected readonly sections = SECTIONS;
}
