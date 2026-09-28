import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  Observable,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import {
  COIN_LIMITS,
  COIN_SORT_COLUMNS,
  Coin,
  CoinListQuery,
  CoinSortColumn,
  DEFAULT_PAGE_SIZE,
  DENOMINATIONS,
  PAGE_SIZE_OPTIONS,
  PagedResponse,
  SortDirection,
  isSortColumn,
  maxCoinYear,
} from '../../core/coins/coin.models';
import { DEFAULT_SORT, SortState, nextSort } from '../../core/coins/coin-sort';
import { CoinService, photoUrl, primaryPhoto } from '../../core/coins/coin.service';
import { CollectionReturn } from '../../core/coins/collection-return';
import { CountryService } from '../../core/coins/country.service';
import {
  Collection as CoinCollection,
  CollectionSummary,
} from '../../core/collections/collection.models';
import { CollectionService, coverUrl, shareLink } from '../../core/collections/collection.service';
import { PluralPipe } from '../../core/i18n/plural';
import { Collector, ExploreCoin } from '../../core/public/public.models';
import { PublicService } from '../../core/public/public.service';
import { denominationLabel, isDenomination } from '../../shared/coin-format';
import { CoinThumb } from '../../shared/coin-thumb/coin-thumb';
import { Pagination } from '../../shared/pagination/pagination';
import { PhotoViewer } from '../../shared/photo-viewer/photo-viewer';
import { SortHeader } from '../../shared/sort-header/sort-header';
import { VisibilityBadge } from '../../shared/visibility-badge/visibility-badge';
import { CollectionDeleteDialog } from '../collections/collection-delete-dialog';
import { CollectionFormDialog } from '../collections/collection-form-dialog';
import { CollectionView, ViewToggle } from './view-toggle';

/**
 * Where the coin list comes from (route data "mode"):
 * - owner: the signed-in user's collection, editable (/collections/:collectionId)
 * - public: someone's public collection, read-only (/u/:userName/:collectionId)
 * - shared: a collection opened with its share link, read-only (/s/:token)
 * - explore: coins of all public collections, read-only, with owner filter (/explore)
 */
export type CoinListMode = 'owner' | 'public' | 'shared' | 'explore';

/** A listed coin: own and shared collections return Coin, Explore adds where it comes from. */
type ListedCoin = Omit<Coin, 'updatedAtUtc'> &
  Partial<Pick<ExploreCoin, 'ownerUserName' | 'collectionName'>>;

/** Header of a single collection, own or someone else's. */
type CollectionHeader = CollectionSummary & { ownerUserName?: string };

type QueryParamValue = string | number | boolean | null;

function toInt(value: string | undefined): number | undefined {
  const n = Number(value);
  return value && Number.isInteger(n) ? n : undefined;
}

/** URL value -> API value: "all" is 0, unknown values fall back to the default. */
function toPageSize(value: string | undefined): number {
  if (value === 'all') {
    return 0;
  }
  const n = toInt(value);
  return n !== undefined && n !== 0 && PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
}

/** Coin list with filters, sort, list/grid view and paging, in one of the modes above. */
@Component({
  selector: 'app-collection',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    PluralPipe,
    Pagination,
    SortHeader,
    CoinThumb,
    PhotoViewer,
    ViewToggle,
    VisibilityBadge,
    CollectionFormDialog,
    CollectionDeleteDialog,
  ],
  templateUrl: './collection.html',
})
export class Collection {
  private readonly coinService = inject(CoinService);
  private readonly countryService = inject(CountryService);
  private readonly collectionService = inject(CollectionService);
  private readonly publicService = inject(PublicService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly collectionReturn = inject(CollectionReturn);
  private readonly title = inject(Title);

  /** Route data and params, bound by withComponentInputBinding(). */
  readonly mode = input<CoinListMode>('owner');
  readonly collectionId = input<string>();
  readonly userName = input<string>();
  readonly token = input<string>();

  protected readonly readOnly = computed(() => this.mode() !== 'owner');
  /** Opens photos of an unlisted collection for visitors. */
  protected readonly shareToken = computed(() =>
    this.mode() === 'shared' ? (this.token() ?? null) : null,
  );
  private readonly collectionIdNumber = computed(() => toInt(this.collectionId()) ?? 0);

  /** The own collection (owner mode); the edit and delete dialogs need all of it. */
  protected readonly collection = signal<CoinCollection | null>(null);
  /** Header data of the shown collection in any single-collection mode; null while loading. */
  protected readonly header = signal<CollectionHeader | null>(null);
  protected readonly notFound = signal(false);
  protected readonly collectionCover = computed(() => {
    const header = this.header();
    return header ? coverUrl(header, 'preview', this.shareToken()) : null;
  });
  protected readonly editing = signal(false);
  /** All collections while the delete dialog is open (it offers the others as move targets). */
  protected readonly deleteTargets = signal<CoinCollection[] | null>(null);
  /** Link others can open, for the owner's "copy link" button. */
  protected readonly ownLink = computed(() => {
    const collection = this.collection();
    const user = this.auth.currentUser();
    return collection && user ? shareLink(collection, user.userName) : null;
  });
  protected readonly copied = signal(false);
  /** Explore user filter. */
  protected readonly collectors = signal<Collector[]>([]);

  // Query params, bound by withComponentInputBinding(); the URL is the single source of truth
  readonly denomination = input<string>();
  readonly countryCode = input<string>();
  readonly year = input<string>();
  readonly isCommemorative = input<string>();
  readonly search = input<string>();
  readonly sort = input<string>();
  readonly dir = input<string>();
  readonly page = input<string>();
  readonly pageSize = input<string>();
  readonly view = input<string>();
  /** Explore: exact user name. */
  readonly owner = input<string>();

  /** List (table / cards) is the default and stays out of the URL. */
  protected readonly viewMode = computed<CollectionView>(() =>
    this.view() === 'grid' ? 'grid' : 'list',
  );

  protected readonly denominations = DENOMINATIONS;
  protected readonly sortColumns = COIN_SORT_COLUMNS;
  /** Explore spans all public collections, so it has no "all" (the API rejects it too). */
  protected readonly pageSizeOptions = computed(() =>
    this.mode() === 'explore' ? PAGE_SIZE_OPTIONS.filter((size) => size !== 0) : PAGE_SIZE_OPTIONS,
  );
  protected readonly countries = this.countryService.countries;
  protected readonly minYear = COIN_LIMITS.minYear;
  protected readonly maxYear = maxCoinYear();
  protected readonly denominationLabel = denominationLabel;

  /** Sort from the URL; unknown values fall back to the default order. */
  protected readonly sortState = computed<SortState>(() => {
    const sort = this.sort();
    if (!isSortColumn(sort)) {
      return DEFAULT_SORT;
    }
    return { sort, dir: this.dir() === 'Desc' ? 'Desc' : 'Asc' };
  });

  protected readonly query = computed<CoinListQuery & { owner?: string }>(() => {
    const denomination = this.denomination();
    const commemorative = this.isCommemorative();
    const { sort, dir } = this.sortState();
    return {
      collectionId: this.mode() === 'owner' ? this.collectionIdNumber() : undefined,
      owner: this.mode() === 'explore' ? this.owner()?.trim() || undefined : undefined,
      denomination: isDenomination(denomination) ? denomination : undefined,
      countryCode: this.countryCode() || undefined,
      year: toInt(this.year()),
      isCommemorative:
        commemorative === 'true' ? true : commemorative === 'false' ? false : undefined,
      search: this.search()?.trim() || undefined,
      sort: sort === 'Newest' ? undefined : sort,
      dir: dir === 'Desc' ? dir : undefined,
      // Country names are localized on the client, so the API gets the display order
      // (also the tie-breaker of other columns); stays correct when the language changes
      countryOrder:
        sort === 'Newest'
          ? undefined
          : this.countries()
              .map((c) => c.code)
              .join(',') || undefined,
      page: Math.max(1, toInt(this.page()) ?? 1),
      pageSize:
        this.mode() === 'explore' && this.pageSize() === 'all'
          ? DEFAULT_PAGE_SIZE
          : toPageSize(this.pageSize()),
    };
  });

  protected readonly hasFilters = computed(() => {
    const q = this.query();
    return !!(
      q.denomination ||
      q.countryCode ||
      q.year ||
      q.isCommemorative !== undefined ||
      q.search ||
      q.owner
    );
  });

  protected readonly result = signal<PagedResponse<ListedCoin> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  /** Coin whose photos are shown fullscreen. */
  protected readonly viewerCoin = signal<ListedCoin | null>(null);

  protected readonly searchControl = new FormControl('', { nonNullable: true });

  constructor() {
    this.countryService.load();

    // The coin form returns to this exact list (collection, view, filters, sort, page)
    combineLatest([this.route.paramMap, this.route.queryParams])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, queryParams]) => {
        if (this.mode() !== 'owner') {
          return;
        }
        this.collectionReturn.remember(
          this.router.serializeUrl(
            this.router.createUrlTree(['/collections', params.get('collectionId')], {
              queryParams,
            }),
          ),
        );
      });

    // Header of the shown collection; also tells a missing (or not shared) one apart
    toObservable(computed(() => [this.mode(), this.collectionIdNumber(), this.token()] as const))
      .pipe(
        tap(() => {
          this.collection.set(null);
          this.header.set(null);
          this.notFound.set(false);
        }),
        switchMap(() => this.loadHeader()),
        takeUntilDestroyed(),
      )
      .subscribe();

    // Reload whenever the URL query changes; switchMap cancels outdated requests
    toObservable(this.query)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(false);
        }),
        switchMap((query) =>
          this.loadCoins(query).pipe(
            catchError(() => {
              this.loadError.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.loading.set(false);
      });

    // Keep the search box in sync with the URL (back/forward, "clear filters")
    effect(() => {
      const value = this.search() ?? '';
      if (value !== this.searchControl.value) {
        this.searchControl.setValue(value, { emitEvent: false });
      }
    });

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        map((value) => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => this.setFilters({ search: value || null }));
  }

  private loadHeader(): Observable<unknown> {
    const notFound = () => {
      this.notFound.set(true);
      return of(null);
    };
    switch (this.mode()) {
      case 'owner':
        return this.collectionService.get(this.collectionIdNumber()).pipe(
          tap((collection) => this.setOwnCollection(collection)),
          catchError(notFound),
        );
      case 'public':
        return this.publicService.collection(this.collectionIdNumber()).pipe(
          tap((collection) => {
            // The user name in the URL must belong to the collection (user names are ASCII)
            if (collection.ownerUserName.toLowerCase() !== (this.userName() ?? '').toLowerCase()) {
              this.notFound.set(true);
              return;
            }
            this.setHeader(collection);
          }),
          catchError(notFound),
        );
      case 'shared':
        return this.publicService.shared(this.token() ?? '').pipe(
          tap((collection) => this.setHeader(collection)),
          catchError(notFound),
        );
      case 'explore':
        return this.publicService.collectors().pipe(
          tap((collectors) => this.collectors.set(collectors)),
          catchError(() => of(null)),
        );
    }
  }

  private loadCoins(
    query: CoinListQuery & { owner?: string },
  ): Observable<PagedResponse<ListedCoin>> {
    switch (this.mode()) {
      case 'owner':
        return this.coinService.list(query);
      case 'public':
        return this.publicService.collectionCoins(this.collectionIdNumber(), query);
      case 'shared':
        return this.publicService.sharedCoins(this.token() ?? '', query);
      case 'explore':
        return this.publicService.explore(query);
    }
  }

  private setOwnCollection(collection: CoinCollection): void {
    this.collection.set(collection);
    this.setHeader(collection);
  }

  private setHeader(header: CollectionHeader): void {
    this.header.set(header);
    this.title.setTitle(
      header.ownerUserName && this.readOnly()
        ? `${header.name} · @${header.ownerUserName} · Coin Portal`
        : `${header.name} · Coin Portal`,
    );
  }

  protected openDelete(): void {
    this.collectionService.list().subscribe((list) => this.deleteTargets.set(list));
  }

  protected onEdited(collection: CoinCollection | null): void {
    this.editing.set(false);
    if (collection) {
      this.setOwnCollection(collection);
    }
  }

  protected onDeleted(deleted: boolean): void {
    this.deleteTargets.set(null);
    if (deleted) {
      this.router.navigate(['/collections']);
    }
  }

  protected async copyLink(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard not allowed; the edit dialog shows the link as selectable text
    }
  }

  protected countryName(code: string): string {
    return this.countryService.name(code);
  }

  /** Grid tiles are larger than list thumbnails, so they use the 600 px size. */
  protected previewUrl(coin: ListedCoin): string | null {
    const photo = primaryPhoto(coin);
    return photo ? photoUrl(coin.id, photo, 'preview', this.shareToken()) : null;
  }

  /** Only the layout changes, so filters, sort and page stay as they are. */
  protected setView(view: CollectionView): void {
    this.navigate({ view: view === 'grid' ? view : null });
  }

  /** Changing any filter goes back to page 1. */
  protected setFilters(params: Record<string, QueryParamValue>): void {
    this.navigate({ ...params, page: null });
  }

  protected setYear(raw: string): void {
    const year = toInt(raw);
    const valid = year !== undefined && year >= this.minYear && year <= this.maxYear;
    this.setFilters({ year: valid ? year : null });
  }

  /** Current direction of a column, or null when the list is sorted by another one. */
  protected sortDirection(column: CoinSortColumn): SortDirection | null {
    const state = this.sortState();
    return state.sort === column ? state.dir : null;
  }

  protected sortBy(column: CoinSortColumn): void {
    this.applySort(nextSort(this.sortState(), column));
  }

  /** Mobile select; values look like "Year:Desc", "Newest" for the default order. */
  protected setSortOption(value: string): void {
    const [sort, dir] = value.split(':');
    this.applySort(
      isSortColumn(sort) ? { sort, dir: dir === 'Desc' ? 'Desc' : 'Asc' } : DEFAULT_SORT,
    );
  }

  private applySort({ sort, dir }: SortState): void {
    // Default sort and ascending direction stay out of the URL
    this.setFilters({
      sort: sort === 'Newest' ? null : sort,
      dir: sort !== 'Newest' && dir === 'Desc' ? dir : null,
    });
  }

  protected goToPage(page: number): void {
    this.navigate({ page: page > 1 ? page : null });
    // The bottom pagination is far from the list start
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected setPageSize(size: number): void {
    // Default size stays out of the URL; 0 is shown as "all"
    this.setFilters({
      pageSize: size === DEFAULT_PAGE_SIZE ? null : size === 0 ? 'all' : size,
    });
  }

  protected clearFilters(): void {
    // Keep the chosen sort order and view
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        sort: this.sort() ?? null,
        dir: this.dir() ?? null,
        view: this.view() ?? null,
      },
    });
  }

  private navigate(params: Record<string, QueryParamValue>): void {
    // Empty strings and nulls remove the param from the URL
    const queryParams = Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, value === '' ? null : value]),
    );
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }
}
