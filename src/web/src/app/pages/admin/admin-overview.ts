import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { formatBytes } from '../../core/admin/admin-format';
import { AdminStats } from '../../core/admin/admin.models';
import { AdminService } from '../../core/admin/admin.service';
import { LanguageService } from '../../core/i18n/language.service';

type TileIcon =
  | 'users'
  | 'active'
  | 'newUser'
  | 'lock'
  | 'collections'
  | 'globe'
  | 'link'
  | 'hidden'
  | 'coins'
  | 'photo'
  | 'storage';

/**
 * Hue of the icon circle (styles.css stat-icon-<color>): fixed per meaning, not the accent color,
 * and the same as the badges where there is one (public green, link only sky, hidden red).
 */
type TileColor =
  'violet' | 'emerald' | 'blue' | 'red' | 'orange' | 'sky' | 'amber' | 'pink' | 'indigo';

interface Tile {
  labelKey: string;
  icon: TileIcon;
  color: TileColor;
  value: (stats: AdminStats, lang: string) => string;
  /** Opens the matching list, e.g. the locked users. */
  link?: { path: string; queryParams: Record<string, string> };
}

const number = (n: number, lang: string) => new Intl.NumberFormat(lang).format(n);

/** Groups of tiles; the counts come from GET api/admin/stats. */
const GROUPS: readonly { titleKey: string; tiles: readonly Tile[] }[] = [
  {
    titleKey: 'admin.overview.users',
    tiles: [
      {
        labelKey: 'admin.overview.users',
        icon: 'users',
        color: 'violet',
        value: (s, l) => number(s.userCount, l),
      },
      {
        labelKey: 'admin.overview.activeUsers',
        icon: 'active',
        color: 'emerald',
        value: (s, l) => number(s.activeUsersLast30Days, l),
      },
      {
        labelKey: 'admin.overview.newUsers',
        icon: 'newUser',
        color: 'blue',
        value: (s, l) => number(s.newUsersLast30Days, l),
      },
      {
        labelKey: 'admin.overview.lockedUsers',
        icon: 'lock',
        color: 'red',
        value: (s, l) => number(s.lockedUserCount, l),
        link: { path: '../users', queryParams: { status: 'Locked' } },
      },
    ],
  },
  {
    titleKey: 'admin.overview.collections',
    tiles: [
      {
        labelKey: 'admin.overview.collections',
        icon: 'collections',
        color: 'orange',
        value: (s, l) => number(s.collectionCount, l),
      },
      {
        labelKey: 'admin.overview.publicCollections',
        icon: 'globe',
        color: 'emerald',
        value: (s, l) => number(s.publicCollectionCount, l),
        link: { path: '../collections', queryParams: { show: 'public' } },
      },
      {
        labelKey: 'admin.overview.unlistedCollections',
        icon: 'link',
        color: 'sky',
        value: (s, l) => number(s.unlistedCollectionCount, l),
        link: { path: '../collections', queryParams: { show: 'unlisted' } },
      },
      {
        labelKey: 'admin.overview.hiddenCollections',
        icon: 'hidden',
        color: 'red',
        value: (s, l) => number(s.hiddenCollectionCount, l),
        link: { path: '../collections', queryParams: { show: 'hidden' } },
      },
    ],
  },
  {
    titleKey: 'admin.overview.content',
    tiles: [
      {
        labelKey: 'admin.overview.coins',
        icon: 'coins',
        color: 'amber',
        value: (s, l) => number(s.coinCount, l),
      },
      {
        labelKey: 'admin.overview.photos',
        icon: 'photo',
        color: 'pink',
        value: (s, l) => number(s.photoCount, l),
      },
      {
        labelKey: 'admin.overview.storage',
        icon: 'storage',
        color: 'indigo',
        value: (s, l) => formatBytes(s.storageBytes, l),
      },
    ],
  },
];

/**
 * Admin > Overview: site-wide numbers, each tile with an icon of what it counts; the locked,
 * public, link-only and hidden tiles open the filtered lists.
 */
@Component({
  selector: 'app-admin-overview',
  imports: [NgTemplateOutlet, RouterLink, TranslocoPipe],
  template: `
    @if (loadError()) {
      <p class="alert-error">{{ 'admin.loadFailed' | transloco }}</p>
    } @else if (stats(); as s) {
      <div class="space-y-6">
        @for (group of groups; track group.titleKey) {
          <section>
            <h2 class="mb-2 text-sm font-semibold text-shade-500">
              {{ group.titleKey | transloco }}
            </h2>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              @for (tile of group.tiles; track tile.labelKey) {
                @if (tile.link; as link) {
                  <a
                    class="card block p-4 transition-colors hover:bg-shade-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                    [routerLink]="link.path"
                    [queryParams]="link.queryParams"
                  >
                    <ng-container
                      *ngTemplateOutlet="tileBody; context: { $implicit: tile, stats: s }"
                    />
                  </a>
                } @else {
                  <div class="card p-4">
                    <ng-container
                      *ngTemplateOutlet="tileBody; context: { $implicit: tile, stats: s }"
                    />
                  </div>
                }
              }
            </div>
          </section>
        }
      </div>
    }

    <ng-template #tileBody let-tile let-s="stats">
      <!-- Number and icon side by side, the label below over the full width (long labels on phones) -->
      <div class="flex items-start justify-between gap-2">
        <p class="text-2xl font-semibold whitespace-nowrap text-shade-900 tabular-nums">
          {{ tile.value(s, language.current()) }}
        </p>
        <span
          class="stat-icon size-9 sm:size-10"
          [class]="'stat-icon-' + tile.color"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            @switch (tile.icon) {
              @case ('users') {
                <circle cx="9" cy="8" r="3.5" />
                <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a6.5 6.5 0 0 1 3.5 5.7" />
              }
              @case ('active') {
                <!-- pulse line -->
                <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />
              }
              @case ('newUser') {
                <circle cx="10" cy="8" r="3.5" />
                <path d="M3.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6" />
              }
              @case ('lock') {
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              }
              @case ('collections') {
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M6 4h12" />
              }
              @case ('globe') {
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
              }
              @case ('link') {
                <path
                  d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"
                />
              }
              @case ('hidden') {
                <!-- shield with a cross, as on the "hidden" badge -->
                <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3z" />
                <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
              }
              @case ('coins') {
                <!-- stacked coins, as in the main menu -->
                <ellipse cx="12" cy="6" rx="7" ry="3" />
                <path
                  d="M5 6v4c0 1.66 3.13 3 7 3s7-1.34 7-3V6M5 10v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4M5 14v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4"
                />
              }
              @case ('photo') {
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="9" cy="10" r="1.5" />
                <path d="m21 16-5-5-8 8" />
              }
              @case ('storage') {
                <!-- disk drive -->
                <rect x="3" y="13" width="18" height="7" rx="2" />
                <path d="M5.5 13 8 5h8l2.5 8M7 16.5h.01M10 16.5h.01" />
              }
            }
          </svg>
        </span>
      </div>
      <p class="mt-1 text-sm text-shade-600">{{ tile.labelKey | transloco }}</p>
    </ng-template>
  `,
})
export class AdminOverview {
  protected readonly language = inject(LanguageService);
  protected readonly groups = GROUPS;
  protected readonly stats = signal<AdminStats | null>(null);
  protected readonly loadError = signal(false);

  constructor() {
    inject(AdminService)
      .stats()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (stats) => this.stats.set(stats),
        error: () => this.loadError.set(true),
      });
  }
}
