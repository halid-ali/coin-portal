import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, translate } from '@jsverse/transloco';
import { Observable, catchError, combineLatest, filter, of, switchMap, tap } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import {
  COIN_LIMITS,
  COIN_SORT_COLUMNS,
  Coin,
  CoinFacets,
  CoinKind,
  CoinListQuery,
  CoinSortColumn,
  DEFAULT_PAGE_SIZE,
  DENOMINATIONS,
  PAGE_SIZE_OPTIONS,
  PagedResponse,
  SortDirection,
  maxCoinYear,
} from '../../core/coins/coin.models';
import { SortState, nextSort, parseSort } from '../../core/coins/coin-sort';
import { CoinService, photoUrl, primaryPhoto } from '../../core/coins/coin.service';
import { CollectionReturn } from '../../core/coins/collection-return';
import { CountryService } from '../../core/coins/country.service';
import {
  Collection as CoinCollection,
  CollectionSummary,
} from '../../core/collections/collection.models';
import { CollectionService, coverUrl, shareLink } from '../../core/collections/collection.service';
import { publicationProgress } from '../../core/collections/publication';
import { httpErrorKey, httpErrorMessage } from '../../core/http/problem-details';
import { firstQueryParam } from '../../core/http/query-params';
import { PluralPipe } from '../../core/i18n/plural';
import { APP_NAME } from '../../core/i18n/translated-title-strategy';
import { ExploreReturn } from '../../core/public/explore-return';
import { Collector, ExploreCoin } from '../../core/public/public.models';
import { PublicService } from '../../core/public/public.service';
import { EMAIL_LIMIT_IDS } from '../../layout/email-banner/email-banner';
import { coinValueLabel, denominationLabel, isDenomination } from '../../shared/coin-format';
import { Breadcrumbs, Crumb } from '../../shared/breadcrumbs/breadcrumbs';
import { CoinThumb } from '../../shared/coin-thumb/coin-thumb';
import { DenominationIcon } from '../../shared/denomination-icon/denomination-icon';
import { OtherCoinIcon } from '../../shared/other-coin-icon/other-coin-icon';
import { LanguageService } from '../../core/i18n/language.service';
import { Combobox } from '../../shared/combobox/combobox';
import { ComboboxOption } from '../../shared/combobox/combobox-filter';
import { scrollToTop } from '../../shared/motion';
import { delayedLoading } from '../../shared/skeleton';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { Pagination } from '../../shared/pagination/pagination';
import { PhotoViewer } from '../../shared/photo-viewer/photo-viewer';
import { SortHeader } from '../../shared/sort-header/sort-header';
import { SEARCH_MAX_LENGTH, normalizeSearch, syncSearchWithUrl } from '../../shared/url-search';
import { VisibilityBadge } from '../../shared/visibility-badge/visibility-badge';
import { CollectionDeleteDialog } from '../collections/collection-delete-dialog';
import { CollectionFormDialog } from '../collections/collection-form-dialog';
import { toInt, toPageSize, toPhotographed } from './collection-url';
import {
  CURRENCY_OPTION,
  nominalOptions,
  nominalSelection,
  showKinds,
  toKind,
} from './coin-filters';
import { cachedIntl } from '../../core/i18n/intl-cache';
import { CollectionView, ViewToggle } from './view-toggle';
import { ImageSkeleton } from '../../shared/image-skeleton';

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

/** Coin list with filters, sort, list/grid view and paging, in one of the modes above. */
@Component({
  selector: 'app-collection',
  imports: [
    ImageSkeleton,
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    PluralPipe,
    Pagination,
    SortHeader,
    CoinThumb,
    DenominationIcon,
    OtherCoinIcon,
    PhotoViewer,
    ViewToggle,
    VisibilityBadge,
    Breadcrumbs,
    CollectionFormDialog,
    CollectionDeleteDialog,
    Combobox,
  ],
  templateUrl: './collection.html',
})
export class Collection {
  private readonly coinService = inject(CoinService);
  private readonly countryService = inject(CountryService);
  private readonly language = inject(LanguageService);
  private readonly collectionService = inject(CollectionService);
  private readonly publicService = inject(PublicService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly collectionReturn = inject(CollectionReturn);
  private readonly exploreReturn = inject(ExploreReturn);
  private readonly title = inject(Title);
  private readonly confirmDialog = inject(ConfirmDialogService);

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
  /** Translation key when the collection could not be loaded for another reason than 404. */
  protected readonly headerError = signal<string | null>(null);
  /** Placeholder shapes for the name, description and count while the header takes a while. */
  protected readonly showHeaderSkeleton = delayedLoading(
    computed(
      () =>
        this.mode() !== 'explore' &&
        this.header() === null &&
        !this.notFound() &&
        this.headerError() === null,
    ),
  );
  protected readonly collectionCover = computed(() => {
    const header = this.header();
    return header ? coverUrl(header, this.shareToken()) : null;
  });
  /**
   * Own collection: My collections > name; public one: Explore > @owner > name. None on Explore
   * itself and on a link-only collection (not reachable from the profile or Explore).
   */
  protected readonly breadcrumbs = computed<readonly Crumb[] | null>(() => {
    const header = this.header();
    switch (this.mode()) {
      case 'owner':
        return [
          { key: 'nav.collections', link: '/collections', icon: 'collections' },
          { text: header?.name ?? '', loading: !header && this.showHeaderSkeleton() },
        ];
      case 'public':
        return header?.ownerUserName
          ? [
              { key: 'nav.explore', link: this.exploreReturn.link(), icon: 'explore' },
              {
                text: '@' + header.ownerUserName,
                link: ['/u', header.ownerUserName],
                avatar: header.ownerUserName.charAt(0).toUpperCase(),
              },
              { text: header.name },
            ]
          : null;
      default:
        return null;
    }
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
  protected readonly copyFailed = signal(false);
  /** Explore user filter. */
  protected readonly collectors = signal<Collector[]>([]);

  // Query params, bound by withComponentInputBinding(); the URL is the single source of truth
  /** "Euro" or "Other" (the kind buttons); missing means every kind. */
  readonly kind = input(undefined, { transform: firstQueryParam });
  readonly denomination = input(undefined, { transform: firstQueryParam });
  /** Other coins in this currency (the denomination select's other half). */
  readonly currency = input(undefined, { transform: firstQueryParam });
  readonly countryCode = input(undefined, { transform: firstQueryParam });
  readonly year = input(undefined, { transform: firstQueryParam });
  readonly isCommemorative = input(undefined, { transform: firstQueryParam });
  readonly search = input(undefined, { transform: firstQueryParam });
  readonly sort = input(undefined, { transform: firstQueryParam });
  readonly dir = input(undefined, { transform: firstQueryParam });
  readonly page = input(undefined, { transform: firstQueryParam });
  readonly pageSize = input(undefined, { transform: firstQueryParam });
  readonly view = input(undefined, { transform: firstQueryParam });
  /** Explore: exact user name. */
  readonly owner = input(undefined, { transform: firstQueryParam });
  /** Own collection: "missing" (without the photos a public collection needs) or "complete". */
  readonly photo = input(undefined, { transform: firstQueryParam });

  /**
   * How far the own collection is from Public (the banner above the list); null when it is
   * Public already or hidden by an admin.
   */
  protected readonly publication = computed(() => {
    const collection = this.collection();
    return collection && collection.visibility !== 'Public' && !collection.moderationLocked
      ? publicationProgress(collection)
      : null;
  });
  protected readonly publishing = signal(false);
  /** Sharing needs a verified e-mail address (API 403 email_not_confirmed). */
  protected readonly emailBlocked = computed(
    () => this.auth.currentUser()?.emailConfirmed === false,
  );
  /** The account's coin limit while the e-mail address is unverified, otherwise null. */
  protected readonly unverifiedMaxCoins = computed(
    () => this.auth.currentUser()?.unverifiedMaxCoins ?? null,
  );
  /**
   * Coins in the whole account (the limit counts every collection), loaded with the own
   * collection while the address is unverified; null otherwise.
   */
  private readonly accountCoinCount = signal<number | null>(null);
  /** The reasons in the e-mail notice, for the gray "Add coin" (aria-describedby). */
  protected readonly limitIds = EMAIL_LIMIT_IDS;
  /** Unverified and at the limit: the API refuses another coin (403 unverified_coin_limit). */
  protected readonly coinLimitReached = computed(() => {
    const max = this.unverifiedMaxCoins();
    const count = this.accountCoinCount();
    return max !== null && count !== null && count >= max;
  });
  /** Translation key when making the collection public failed. */
  protected readonly publishError = signal<string | null>(null);
  /**
   * The banner's "missing" link: only the coins without photos. Search and filters would hide
   * some of them; sort, page size and view are kept.
   */
  protected readonly missingPhotosQuery = computed(() => ({
    photo: 'missing',
    sort: this.sort() ?? null,
    dir: this.dir() ?? null,
    pageSize: this.pageSize() ?? null,
    view: this.view() ?? null,
  }));

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
  /** The year filter takes every coin's year (other coins are older than the euro). */
  protected readonly minYear = COIN_LIMITS.otherMinYear;

  /**
   * Kinds, currencies and countries of this list (null while a list's first ones load or when they
   * failed). Another kind or collector keeps the old ones until the new ones are there, so the kind
   * buttons stay; the filters they feed are locked meanwhile (`facetsReloading`).
   */
  protected readonly facets = signal<CoinFacets | null>(null);
  /**
   * What the facets being loaded will change: another kind only the countries (the counts and
   * currencies are the whole list's), another collector all of them.
   */
  protected readonly facetsReloading = signal<'none' | 'countries' | 'all'>('none');
  protected readonly showKinds = computed(() => showKinds(this.facets()));
  protected readonly kinds: readonly (CoinKind | null)[] = [null, 'Euro', 'Other'];
  protected readonly nominal = computed(() =>
    nominalOptions(this.query().kind, this.facets(), this.query().currency),
  );
  /**
   * The nominal filter's options: under a "Euro coin" and a "World coin" heading when it has both.
   * Reads the language, so the names follow a switch.
   */
  protected readonly nominalChoices = computed<ComboboxOption[]>(() => {
    this.language.current();
    const { denominations, currencies, grouped } = this.nominal();
    const euro = grouped ? translate('coin.kind.Euro.label') : undefined;
    const other = grouped ? translate('coin.kind.Other.label') : undefined;
    return [
      ...denominations.map((d) => ({ value: d, label: denominationLabel(d), group: euro })),
      ...currencies.map((c) => ({ value: CURRENCY_OPTION + c, label: c, group: other })),
    ];
  });
  /** The URL's denomination or currency as a nominal option (a currency in any case). */
  protected readonly nominalValue = computed(() => {
    const { denomination, currency } = this.query();
    if (denomination) {
      return denomination;
    }
    const value = currency ? (CURRENCY_OPTION + currency).toLowerCase() : null;
    return this.nominalChoices().find((o) => o.value.toLowerCase() === value)?.value ?? '';
  });
  /**
   * Only the countries the list has (of the chosen kind), sorted by name; until the facets are
   * there, every country (the euro issuers for euro coins). A country in the URL stays offered.
   */
  private readonly countryOptions = computed(() => {
    const facets = this.facets();
    const { kind, countryCode } = this.query();
    if (!facets) {
      return kind === 'Euro' ? this.countryService.euroCountries() : this.countries();
    }
    const codes = new Set(facets.countryCodes);
    if (countryCode) {
      codes.add(countryCode);
    }
    return this.countries().filter((c) => codes.has(c.code));
  });
  protected readonly maxYear = maxCoinYear();
  protected readonly countryChoices = computed<ComboboxOption[]>(() =>
    this.countryOptions().map((c) => ({ value: c.code, label: c.name })),
  );
  /** The commemorative and photo filters' options; read the language, so they follow a switch. */
  protected readonly commemorativeOptions = computed<ComboboxOption[]>(() => {
    this.language.current();
    return [
      { value: 'true', label: translate('coinList.onlyCommemorative') },
      { value: 'false', label: translate('coinList.notCommemorative') },
    ];
  });
  protected readonly commemorativeValue = computed(() => {
    const value = this.query().isCommemorative;
    return value === undefined ? '' : String(value);
  });
  protected readonly photoOptions = computed<ComboboxOption[]>(() => {
    this.language.current();
    return [
      { value: 'missing', label: translate('coinList.photoMissing') },
      { value: 'complete', label: translate('coinList.photoComplete') },
    ];
  });
  protected readonly photoValue = computed(() => {
    const value = this.query().photographed;
    return value === undefined ? '' : value ? 'complete' : 'missing';
  });
  protected readonly collectorOptions = computed<ComboboxOption[]>(() =>
    this.collectors().map((c) => ({ value: c.userName, label: `@${c.userName} (${c.coinCount})` })),
  );

  /** Sort from the URL; unknown values fall back to the default order. */
  protected readonly sortState = computed<SortState>(() => parseSort(this.sort(), this.dir()));

  protected readonly query = computed<CoinListQuery & { owner?: string }>(() => {
    const denomination = this.denomination();
    const commemorative = this.isCommemorative();
    const { sort, dir } = this.sortState();
    const kind = toKind(this.kind());
    return {
      collectionId: this.mode() === 'owner' ? this.collectionIdNumber() : undefined,
      owner: this.mode() === 'explore' ? this.owner()?.trim() || undefined : undefined,
      kind,
      // Only euro coins have a denomination, only other coins a currency
      denomination: kind !== 'Other' && isDenomination(denomination) ? denomination : undefined,
      currency: kind !== 'Euro' ? this.currency()?.trim() || undefined : undefined,
      countryCode: this.countryCode() || undefined,
      year: toInt(this.year()),
      isCommemorative:
        commemorative === 'true' ? true : commemorative === 'false' ? false : undefined,
      photographed: this.mode() === 'owner' ? toPhotographed(this.photo()) : undefined,
      search: normalizeSearch(this.search()) || undefined,
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

  /**
   * What the list loads; null while a sort waits for the countries (their display order goes to
   * the API), so a cold start does not ask twice.
   */
  private readonly listQuery = computed(() => {
    const query = this.query();
    return query.sort && !this.countryService.settled() ? null : query;
  });

  protected readonly hasFilters = computed(() => {
    const q = this.query();
    return !!(
      q.kind ||
      q.denomination ||
      q.currency ||
      q.countryCode ||
      q.year ||
      q.isCommemorative !== undefined ||
      q.photographed !== undefined ||
      q.search ||
      q.owner
    );
  });

  /** Phones: the filters (all but the search box) fold away behind a toggle, closed by default. */
  protected readonly filtersOpen = signal(false);
  /** Filters set behind the toggle, shown on it so they are not forgotten while folded. */
  protected readonly foldedFilterCount = computed(() => {
    const q = this.query();
    return [
      q.denomination ?? q.currency,
      q.countryCode,
      q.year,
      q.isCommemorative,
      q.photographed,
      q.owner,
    ].filter((v) => v != null).length;
  });

  protected readonly result = signal<PagedResponse<ListedCoin> | null>(null);

  /**
   * An empty collection has nothing to search or filter, so the filter card (with the sort row)
   * stays hidden; it shows once the collection is known to have coins. Filters already in the URL
   * keep it, so they can still be changed.
   */
  protected readonly showFilters = computed(() => {
    if (this.hasFilters()) {
      return true;
    }
    if (this.mode() === 'explore') {
      return (this.result()?.totalCount ?? 0) > 0;
    }
    return (this.header()?.coinCount ?? 0) > 0;
  });
  protected readonly loading = signal(true);
  /** Placeholder shapes in the list's place: a load that takes a while. */
  protected readonly showSkeleton = delayedLoading(this.loading);
  /**
   * As many placeholder rows as the list has now, so the page keeps its height; a list's first load
   * (or one with no coins shown) takes the collection's coins up to a page.
   */
  protected readonly skeletonRows = computed(() => {
    const shown = this.result()?.items.length || Math.min(this.header()?.coinCount ?? 10, 10);
    return [...Array(Math.min(Math.max(shown, 1), 50)).keys()];
  });
  /** Bar widths that vary from row to row, like real titles. */
  protected readonly skeletonWidths = ['w-3/5', 'w-2/5', 'w-1/2', 'w-1/3', 'w-[55%]'];
  /** Translation key when the coin list could not be loaded. */
  protected readonly loadError = signal<string | null>(null);
  /** Coin whose photos are shown fullscreen. */
  protected readonly viewerCoin = signal<ListedCoin | null>(null);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchMaxLength = SEARCH_MAX_LENGTH;

  constructor() {
    this.countryService.load();

    // The coin form returns to this exact list (collection, view, filters, sort, page), the
    // breadcrumbs of a profile or public collection to this exact Explore. The route data, not the
    // mode input: inputs are bound after this first, synchronous emission
    combineLatest([this.route.paramMap, this.route.queryParams])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, queryParams]) => {
        const mode = this.route.snapshot.data['mode'];
        if (mode === 'explore') {
          this.exploreReturn.remember(
            this.router.serializeUrl(this.router.createUrlTree(['/explore'], { queryParams })),
          );
        }
        if (mode !== 'owner') {
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
          this.accountCoinCount.set(null);
          this.header.set(null);
          this.notFound.set(false);
          this.headerError.set(null);
          this.publishError.set(null);
          this.deleteError.set(null);
        }),
        switchMap(() => this.loadHeader()),
        takeUntilDestroyed(),
      )
      .subscribe();

    // Kinds, currencies and countries for the filters: per list and kind (the other filters do
    // not change them)
    let shownFor: readonly unknown[] | null = null;
    toObservable(
      computed(
        () =>
          [
            this.mode(),
            this.collectionIdNumber(),
            this.token(),
            this.query().owner,
            this.query().kind,
          ] as const,
        // A new page, sort or other filter is the same key: no new request
        { equal: (a, b) => a.every((value, i) => value === b[i]) },
      ),
    )
      .pipe(
        tap((key) => {
          const [mode, id, token, owner] = key;
          const sameList =
            shownFor !== null &&
            this.facets() !== null &&
            shownFor[0] === mode &&
            shownFor[1] === id &&
            shownFor[2] === token;
          if (!sameList) {
            this.facets.set(null);
          }
          this.facetsReloading.set(
            !sameList ? 'none' : shownFor![3] === owner ? 'countries' : 'all',
          );
          shownFor = key;
        }),
        switchMap(() => this.loadFacets().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((facets) => {
        this.facets.set(facets);
        this.facetsReloading.set('none');
      });

    // Reload whenever the URL query changes; switchMap cancels outdated requests
    toObservable(this.listQuery)
      .pipe(
        filter((query) => query !== null),
        tap(() => {
          this.loading.set(true);
          this.loadError.set(null);
        }),
        switchMap((query) =>
          this.loadCoins(query).pipe(
            catchError((err: HttpErrorResponse) => {
              // A rate limit or a lost connection says so; the rest is "could not be loaded"
              this.loadError.set(
                err.status === 0 || err.status === 429 ? httpErrorKey(err) : 'coinList.loadError',
              );
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        // A page past the last one comes back empty (its last coin was deleted or moved, or an
        // old link): go to the last page instead of "no coins yet" without paging
        if (result && result.totalCount > 0 && result.page > result.totalPages) {
          this.navigate({ page: result.totalPages > 1 ? result.totalPages : null }, true);
          return;
        }
        this.result.set(result);
        this.loading.set(false);
      });

    syncSearchWithUrl(this.searchControl, this.search, (search) => this.setFilters({ search }));
  }

  private loadHeader(): Observable<unknown> {
    // Only a 404 means missing (or not shared); a server error or a rate limit says what it is
    const notFound = (err: HttpErrorResponse) => {
      if (err.status === 404) {
        this.notFound.set(true);
      } else {
        this.headerError.set(httpErrorKey(err));
      }
      return of(null);
    };
    switch (this.mode()) {
      case 'owner':
        return this.collectionService.get(this.collectionIdNumber()).pipe(
          tap((collection) => this.setOwnCollection(collection)),
          switchMap(() => this.loadAccountCoinCount()),
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

  /** Only while the address is unverified; without the count, "Add coin" stays (the API decides). */
  private loadAccountCoinCount(): Observable<unknown> {
    if (this.unverifiedMaxCoins() === null) {
      return of(null);
    }
    return this.coinService.summary().pipe(
      tap((summary) => this.accountCoinCount.set(summary.coinCount)),
      catchError(() => of(null)),
    );
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

  private loadFacets(): Observable<CoinFacets> {
    const { kind, owner } = this.query();
    switch (this.mode()) {
      case 'owner':
        return this.coinService.facets({ collectionId: this.collectionIdNumber(), kind });
      case 'public':
        return this.publicService.collectionFacets(this.collectionIdNumber(), kind);
      case 'shared':
        return this.publicService.sharedFacets(this.token() ?? '', kind);
      case 'explore':
        return this.publicService.exploreFacets(owner, kind);
    }
  }

  /** A kind button: the denomination, currency and country of the other kind would find nothing. */
  protected setKind(kind: CoinKind | null): void {
    if (kind === (this.query().kind ?? null)) {
      return;
    }
    this.setFilters({ kind, denomination: null, currency: null, countryCode: null });
  }

  protected setNominal(value: string): void {
    this.setFilters(nominalSelection(value));
  }

  /** A kind's coins on its button, in the language's number format ("1.240"). */
  protected kindCount(kind: CoinKind | null): number | null {
    const facets = this.facets();
    // Another collector's counts are on the way
    if (!facets || this.facetsReloading() === 'all') {
      return null;
    }
    return kind === 'Euro'
      ? facets.euroCount
      : kind === 'Other'
        ? facets.otherCount
        : facets.euroCount + facets.otherCount;
  }

  protected formatCount(count: number): string {
    const lang = this.language.current();
    return cachedIntl(`count|${lang}`, () => new Intl.NumberFormat(lang)).format(count);
  }

  private setOwnCollection(collection: CoinCollection): void {
    this.collection.set(collection);
    this.setHeader(collection);
  }

  private setHeader(header: CollectionHeader): void {
    this.header.set(header);
    this.title.setTitle(
      header.ownerUserName && this.readOnly()
        ? `${header.name} · @${header.ownerUserName} · ${APP_NAME}`
        : `${header.name} · ${APP_NAME}`,
    );
  }

  /** Set when the delete dialog could not be prepared (the list request failed). */
  protected readonly deleteError = signal<string | null>(null);

  /**
   * The dialog decides with fresh data (coin count, other collections): this page's copy may be
   * older than another tab's changes.
   */
  protected openDelete(): void {
    this.deleteError.set(null);
    this.collectionService.list().subscribe({
      next: (list) => this.deleteTargets.set(list),
      error: (err: HttpErrorResponse) => this.deleteError.set(httpErrorMessage(err)),
    });
  }

  protected freshOf(list: CoinCollection[], collection: CoinCollection): CoinCollection {
    return list.find((c) => c.id === collection.id) ?? collection;
  }

  protected onEdited(collection: CoinCollection | null): void {
    this.editing.set(false);
    if (collection) {
      this.setOwnCollection(collection);
    }
  }

  /**
   * The banner's button, once the collection meets the requirements. A collection shared by link
   * asks first: its link stops working.
   */
  protected async publish(): Promise<void> {
    const collection = this.collection();
    if (!collection || this.publishing()) {
      return;
    }
    if (
      collection.visibility === 'Unlisted' &&
      !(await this.confirmDialog.confirm({
        title: translate('publication.publishShared.title'),
        message: translate('publication.publishShared.message'),
        confirmText: translate('publication.publish'),
        cancelText: translate('common.cancel'),
      }))
    ) {
      return;
    }
    this.publishing.set(true);
    this.publishError.set(null);
    this.collectionService.publish(collection.id).subscribe({
      next: (updated) => {
        this.publishing.set(false);
        this.setOwnCollection(updated);
      },
      error: (err: HttpErrorResponse) => {
        this.publishing.set(false);
        // Coins changed in another tab meanwhile: the page shows the fresh counts
        if ((err.error as { code?: string } | null)?.code === 'public_requirements') {
          this.publishError.set('publication.requirementsNotMet');
          this.collectionService
            .get(collection.id)
            .subscribe((fresh) => this.setOwnCollection(fresh));
          return;
        }
        this.publishError.set(httpErrorKey(err));
      },
    });
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
      // Clipboard not allowed: say so; the edit dialog shows the link as selectable text
      this.copyFailed.set(true);
      setTimeout(() => this.copyFailed.set(false), 3000);
    }
  }

  protected countryName(code: string): string {
    return this.countryService.name(code);
  }

  /** "2 €" or "25 kuruş", in the active language's number format. */
  protected valueLabel(coin: ListedCoin): string {
    return coinValueLabel(coin, this.language.current());
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
    this.applySort(parseSort(sort, dir));
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
    scrollToTop();
  }

  protected setPageSize(size: number): void {
    // Default size stays out of the URL; 0 is shown as "all"
    this.setFilters({
      pageSize: size === DEFAULT_PAGE_SIZE ? null : size === 0 ? 'all' : size,
    });
  }

  protected clearFilters(): void {
    // The button stays (aria-disabled) when there is nothing to clear
    if (!this.hasFilters()) {
      return;
    }
    // Keep the chosen sort order, page size and view
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        sort: this.sort() ?? null,
        dir: this.dir() ?? null,
        pageSize: this.pageSize() ?? null,
        view: this.view() ?? null,
      },
    });
  }

  private navigate(params: Record<string, QueryParamValue>, replaceUrl = false): void {
    // Empty strings and nulls remove the param from the URL
    const queryParams = Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, value === '' ? null : value]),
    );
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
