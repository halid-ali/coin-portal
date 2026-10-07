import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  Observable,
  catchError,
  concat,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { Coin, CoinSummary } from '../../core/coins/coin.models';
import { CoinService, photoUrl, primaryPhoto } from '../../core/coins/coin.service';
import { Collection } from '../../core/collections/collection.models';
import { CollectionService } from '../../core/collections/collection.service';
import { EMAIL_LIMIT_IDS } from '../../layout/email-banner/email-banner';
import { httpErrorKey } from '../../core/http/problem-details';
import { PluralPipe } from '../../core/i18n/plural';
import { CoinThumb } from '../../shared/coin-thumb/coin-thumb';
import { DenominationIcon } from '../../shared/denomination-icon/denomination-icon';
import { CollectionCard } from '../../shared/collection-card/collection-card';
import { SEARCH_MAX_LENGTH } from '../../shared/url-search';
import { CollectionFormDialog } from '../collections/collection-form-dialog';

/** Results of the quick check ("do I have this coin?"). */
export type QuickCheck =
  | { state: 'idle' }
  | { state: 'searching' }
  | { state: 'done'; items: Coin[]; total: number }
  | { state: 'error'; key: string };

/** How many matches the quick check lists; the rest is a count. */
export const QUICK_CHECK_SIZE = 5;
/** Coins in "recently added". */
export const RECENT_SIZE = 5;
/** Collections on the home page; all of them are on My collections. */
export const HOME_COLLECTIONS = 5;

/**
 * Home page of a signed-in user: a search over all of their collections ("do I have this coin?"),
 * counts, the coins added last, their collections and the link to their public profile.
 */
@Component({
  selector: 'app-home-dashboard',
  imports: [
    RouterLink,
    TranslocoPipe,
    PluralPipe,
    CoinThumb,
    DenominationIcon,
    CollectionCard,
    CollectionFormDialog,
  ],
  host: { class: 'block' },
  template: `
    <section class="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between sm:pt-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-shade-900 sm:text-3xl">
          {{ 'home.welcome' | transloco: { name: auth.currentUser()?.firstName } }}
        </h1>
        @if (summary(); as s) {
          <p class="mt-1 text-shade-600">
            @if (s.coinCount > 0) {
              {{ 'home.dashboard.coinTotal' | plural: s.coinCount }}
            } @else {
              {{ 'home.dashboard.empty' | transloco }}
            }
          </p>
        }
      </div>
      <!-- Side by side; if they do not fit they wrap, their text does not -->
      <div class="flex flex-wrap gap-3">
        @if (coinLimitReached()) {
          <!-- A link cannot be disabled: a gray button, the reason in the e-mail notice -->
          <button
            type="button"
            class="btn-unavailable flex-auto whitespace-nowrap sm:flex-none"
            aria-disabled="true"
            [attr.aria-describedby]="limitIds.coins"
          >
            <span aria-hidden="true" class="mr-1.5">+</span
            >{{ 'home.dashboard.addCoin' | transloco }}
          </button>
        } @else {
          <a routerLink="/coins/new" class="btn-primary flex-auto whitespace-nowrap sm:flex-none">
            <span aria-hidden="true" class="mr-1.5">+</span
            >{{ 'home.dashboard.addCoin' | transloco }}
          </a>
        }
        <a
          routerLink="/collections"
          class="btn-secondary flex-auto whitespace-nowrap sm:flex-none"
          >{{ 'nav.collections' | transloco }}</a
        >
      </div>
    </section>

    <!-- Quick check over all collections -->
    <section class="card mt-5 p-5 sm:px-6">
      <label for="quick-check" class="flex items-center gap-2.5 font-semibold text-shade-900">
        <span class="stat-icon stat-icon-emerald size-8 rounded-lg">
          <svg
            viewBox="0 0 24 24"
            class="size-4.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7.5" />
            <path d="m20.5 20.5-4.2-4.2M8 11l2.2 2.2L14.5 9" />
          </svg>
        </span>
        {{ 'home.check.title' | transloco }}
      </label>
      <div class="relative mt-3">
        <svg
          viewBox="0 0 24 24"
          class="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-shade-400"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7.5" />
          <path d="m20.5 20.5-4.2-4.2" />
        </svg>
        <input
          id="quick-check"
          type="search"
          class="form-input pl-10"
          autocomplete="off"
          [attr.maxlength]="searchMaxLength"
          [placeholder]="'home.check.placeholder' | transloco"
          aria-describedby="quick-check-result"
          [value]="term()"
          (input)="term.set($any($event.target).value)"
        />
      </div>
      <div id="quick-check-result" role="status">
        @switch (check().state) {
          @case ('searching') {
            <p class="mt-3 text-sm text-shade-500">{{ 'common.loading' | transloco }}</p>
          }
          @case ('error') {
            <p class="alert-error mt-3">{{ errorKey() | transloco }}</p>
          }
          @case ('done') {
            @if (found().length === 0) {
              <p class="mt-3 rounded-lg bg-shade-50 px-3 py-2.5 text-sm text-shade-700">
                {{ 'home.check.none' | transloco }}
              </p>
            } @else {
              <ul class="mt-3 space-y-2">
                @for (coin of found(); track coin.id) {
                  <li>
                    <a
                      [routerLink]="['/coins', coin.id, 'edit']"
                      class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-success-50 px-3 py-2 text-sm ring-1 ring-success-200 hover:bg-success-100 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
                    >
                      <app-coin-thumb class="size-8" [coin]="coin" />
                      <span class="font-bold text-success-700">
                        <span aria-hidden="true">✓</span> {{ 'home.check.owned' | transloco }}
                      </span>
                      <span class="min-w-0 flex-1 truncate font-medium text-shade-900">{{
                        coin.title
                      }}</span>
                      <span class="w-full text-xs text-shade-600 sm:w-auto"
                        >{{ collectionName(coin.collectionId) }} ·
                        {{ 'home.check.quantity' | plural: coin.quantity }}</span
                      >
                    </a>
                  </li>
                }
              </ul>
              @if (moreFound() > 0) {
                <p class="mt-2 text-sm text-shade-600">
                  {{ 'home.check.more' | plural: moreFound() }}
                </p>
              }
            }
          }
        }
      </div>
    </section>

    @if (summary(); as s) {
      <section class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <h2 class="sr-only">{{ 'home.stats.title' | transloco }}</h2>
        @for (stat of stats(); track stat.key) {
          <!-- Phone: icon above the number, so long labels (Gedenkmünzen) fit -->
          <div
            class="card flex flex-col items-start gap-2.5 p-3.5 sm:flex-row sm:items-center sm:gap-3.5 sm:p-4"
          >
            <span class="stat-icon size-10 rounded-xl sm:size-11" [class]="stat.hue">
              <svg
                viewBox="0 0 24 24"
                class="size-5.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                @switch (stat.key) {
                  @case ('coins') {
                    <ellipse cx="12" cy="6" rx="7" ry="3" />
                    <path
                      d="M5 6v4c0 1.66 3.13 3 7 3s7-1.34 7-3V6M5 10v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4M5 14v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4"
                    />
                  }
                  @case ('collections') {
                    <path
                      d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                    />
                  }
                  @case ('countries') {
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                  }
                  @case ('commemoratives') {
                    <path
                      d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"
                    />
                  }
                }
              </svg>
            </span>
            <p class="min-w-0">
              <span class="block text-xl leading-tight font-bold text-shade-900">{{
                stat.value
              }}</span>
              <span class="block text-sm break-words text-shade-500">{{
                'home.stats.' + stat.key | plural: stat.value
              }}</span>
            </p>
          </div>
        }
      </section>
    }

    @if (recent()?.length) {
      <section class="mt-9">
        <h2 class="mb-3.5 text-xl font-bold text-shade-900">
          {{ 'home.dashboard.recent' | transloco }}
        </h2>
        <!-- Phone: a row that scrolls sideways; wider: five columns -->
        <ul
          class="-mx-1 grid auto-cols-[42%] grid-flow-col gap-3 overflow-x-auto px-1 pb-1 sm:auto-cols-[30%] md:grid-flow-row md:grid-cols-5 md:gap-3.5 md:overflow-visible"
        >
          @for (coin of recent(); track coin.id) {
            <li>
              <a
                [routerLink]="['/coins', coin.id, 'edit']"
                class="card group block h-full overflow-hidden p-0 hover:border-brand-300 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
              >
                <div
                  class="grid aspect-square place-items-center border-b border-shade-200 bg-shade-50"
                >
                  @if (previewUrl(coin); as src) {
                    <img
                      [src]="src"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      class="size-3/4 rounded-full object-cover shadow-md ring-1 ring-shade-200"
                    />
                  } @else {
                    <app-denomination-icon class="size-[90%]" [denomination]="coin.denomination" />
                  }
                </div>
                <div class="px-3 py-2.5">
                  <p class="line-clamp-2 text-sm font-semibold text-shade-900">{{ coin.title }}</p>
                  <p class="truncate text-xs text-shade-500">
                    {{ collectionName(coin.collectionId) }}
                  </p>
                </div>
              </a>
            </li>
          }
        </ul>
      </section>
    }

    <section class="mt-9">
      <div class="mb-3.5 flex items-end justify-between gap-3">
        <h2 class="text-xl font-bold text-shade-900">
          {{ 'home.dashboard.collections' | transloco }}
        </h2>
        <a routerLink="/collections" class="link text-sm"
          >{{ 'home.dashboard.manage' | transloco }} <span aria-hidden="true">→</span></a
        >
      </div>
      @if (collectionsError()) {
        <p role="alert" class="alert-error">{{ 'collections.loadError' | transloco }}</p>
      } @else if (collections(); as list) {
        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (collection of list.slice(0, homeCollections); track collection.id) {
            <li>
              <app-collection-card
                [collection]="collection"
                [link]="['/collections', collection.id]"
                [showVisibility]="true"
              />
            </li>
          }
          <!-- Gray until the address is verified (the reason is in the e-mail notice) -->
          <li>
            <button
              type="button"
              (click)="createCollection()"
              class="flex size-full min-h-16 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-shade-300 font-semibold focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none sm:min-h-48 sm:flex-col"
              [class]="
                emailBlocked()
                  ? 'cursor-not-allowed bg-shade-100 text-shade-400'
                  : 'bg-shade-50 text-shade-600 hover:border-brand-300 hover:text-shade-900'
              "
              [attr.aria-disabled]="emailBlocked() || null"
              [attr.aria-describedby]="emailBlocked() ? limitIds.collections : null"
            >
              <span aria-hidden="true" class="text-2xl leading-none font-normal">+</span>
              {{ 'collections.new' | transloco }}
            </button>
          </li>
        </ul>
      } @else {
        <p role="status" class="text-shade-500">{{ 'common.loading' | transloco }}</p>
      }
    </section>

    @if (profileUrl(); as url) {
      <section class="card mt-9 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:px-6">
        <span class="stat-icon stat-icon-sky size-11 rounded-xl">
          <svg
            viewBox="0 0 24 24"
            class="size-5.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"
            />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="font-semibold text-shade-900">{{ 'home.profile.title' | transloco }}</h2>
          <p class="mt-0.5 text-sm text-shade-600">
            {{ 'home.profile.text' | transloco }}
            <a
              [routerLink]="profilePath()"
              class="link font-mono text-[13px] font-normal break-all"
              >{{ url }}</a
            >
          </p>
        </div>
        <button type="button" class="btn-secondary whitespace-nowrap" (click)="copyProfileLink()">
          {{ copyLabel() | transloco }}
        </button>
      </section>
    }

    @defer (when creating(); prefetch on idle) {
      @if (creating()) {
        <app-collection-form-dialog (closed)="onCreated($event)" />
      }
    }
  `,
})
export class HomeDashboard {
  protected readonly auth = inject(AuthService);
  private readonly coinService = inject(CoinService);
  private readonly collectionService = inject(CollectionService);
  private readonly router = inject(Router);

  protected readonly searchMaxLength = SEARCH_MAX_LENGTH;
  protected readonly homeCollections = HOME_COLLECTIONS;

  protected readonly collections = signal<Collection[] | null>(null);
  protected readonly collectionsError = signal(false);
  protected readonly summary = signal<CoinSummary | null>(null);
  /** Another collection waits for a verified e-mail address. */
  protected readonly emailBlocked = computed(
    () => this.auth.currentUser()?.emailConfirmed === false,
  );
  /** The reasons in the e-mail notice, for the gray buttons (aria-describedby). */
  protected readonly limitIds = EMAIL_LIMIT_IDS;
  /** Unverified e-mail address and as many coins as it allows (the API refuses another). */
  protected readonly coinLimitReached = computed(() => {
    const max = this.auth.currentUser()?.unverifiedMaxCoins ?? null;
    const summary = this.summary();
    return max !== null && summary !== null && summary.coinCount >= max;
  });
  protected readonly recent = signal<Coin[] | null>(null);
  protected readonly creating = signal(false);
  private readonly copyState = signal<'idle' | 'copied' | 'failed'>('idle');

  /** The search box; the request runs 300 ms after the last key press. */
  protected readonly term = signal('');
  protected readonly check = toSignal(
    toObservable(this.term).pipe(
      map((t) => t.trim().slice(0, SEARCH_MAX_LENGTH)),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((search) => (search ? this.quickCheck(search) : of<QuickCheck>({ state: 'idle' }))),
    ),
    { initialValue: { state: 'idle' } as QuickCheck },
  );
  protected readonly found = computed(() => {
    const check = this.check();
    return check.state === 'done' ? check.items : [];
  });
  protected readonly moreFound = computed(() => {
    const check = this.check();
    return check.state === 'done' ? check.total - check.items.length : 0;
  });
  protected readonly errorKey = computed(() => {
    const check = this.check();
    return check.state === 'error' ? check.key : '';
  });

  protected readonly stats = computed(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { key: 'coins', hue: 'stat-icon-amber', value: s.coinCount },
      { key: 'collections', hue: 'stat-icon-sky', value: this.collections()?.length ?? 0 },
      { key: 'countries', hue: 'stat-icon-emerald', value: s.countryCount },
      { key: 'commemoratives', hue: 'stat-icon-violet', value: s.commemorativeCount },
    ];
  });

  /** Profile path, only while a collection is public (the profile lists those). */
  protected readonly profilePath = computed(() => {
    const userName = this.auth.currentUser()?.userName;
    const isPublic = this.collections()?.some(
      (c) => c.visibility === 'Public' && !c.moderationLocked,
    );
    return userName && isPublic ? ['/u', userName] : null;
  });
  /** The profile address as shown (host and path) */
  protected readonly profileUrl = computed(() => {
    const path = this.profilePath();
    return path ? `${location.host}/u/${path[1]}` : null;
  });
  protected readonly copyLabel = computed(() =>
    this.copyState() === 'copied'
      ? 'common.copied'
      : this.copyState() === 'failed'
        ? 'common.copyFailed'
        : 'coinList.copyLink',
  );

  private readonly collectionNames = computed(
    () => new Map((this.collections() ?? []).map((c) => [c.id, c.name])),
  );

  constructor() {
    this.collectionService.list().subscribe({
      next: (list) => this.collections.set(list),
      error: () => this.collectionsError.set(true),
    });
    // Counts and recent coins are extras: without them the page still works
    this.coinService.summary().subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.summary.set(null),
    });
    this.coinService.list({ sort: 'Newest', pageSize: RECENT_SIZE }).subscribe({
      next: (page) => this.recent.set(page.items),
      error: () => this.recent.set(null),
    });
  }

  protected collectionName(id: number): string {
    return this.collectionNames().get(id) ?? '';
  }

  protected previewUrl(coin: Coin): string | null {
    const photo = primaryPhoto(coin);
    return photo ? photoUrl(coin.id, photo, 'preview') : null;
  }

  protected async copyProfileLink(): Promise<void> {
    const path = this.profilePath();
    if (!path) return;
    try {
      await navigator.clipboard.writeText(`${location.origin}/u/${path[1]}`);
      this.copyState.set('copied');
    } catch {
      this.copyState.set('failed');
    }
    setTimeout(() => this.copyState.set('idle'), 2000);
  }

  protected createCollection(): void {
    if (!this.emailBlocked()) {
      this.creating.set(true);
    }
  }

  /** A new collection is empty: go straight to it, so coins can be added. */
  protected onCreated(collection: Collection | null): void {
    this.creating.set(false);
    if (collection) {
      this.router.navigate(['/collections', collection.id]);
    }
  }

  private quickCheck(search: string): Observable<QuickCheck> {
    return concat(
      of<QuickCheck>({ state: 'searching' }),
      this.coinService.list({ search, pageSize: QUICK_CHECK_SIZE }).pipe(
        map((page): QuickCheck => ({ state: 'done', items: page.items, total: page.totalCount })),
        catchError((err: HttpErrorResponse) =>
          of<QuickCheck>({ state: 'error', key: httpErrorKey(err) }),
        ),
      ),
    );
  }
}
