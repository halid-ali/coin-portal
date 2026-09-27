import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

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
import { CoinService } from '../../core/coins/coin.service';
import { CountryService } from '../../core/coins/country.service';
import { denominationLabel, isDenomination } from '../../shared/coin-format';
import { CoinThumb } from '../../shared/coin-thumb/coin-thumb';
import { Pagination } from '../../shared/pagination/pagination';
import { PhotoViewer } from '../../shared/photo-viewer/photo-viewer';
import { SortHeader } from '../../shared/sort-header/sort-header';

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
  return PAGE_SIZE_OPTIONS.some((o) => o.value === n && n !== 0) ? n! : DEFAULT_PAGE_SIZE;
}

@Component({
  selector: 'app-collection',
  imports: [ReactiveFormsModule, RouterLink, Pagination, SortHeader, CoinThumb, PhotoViewer],
  templateUrl: './collection.html',
})
export class Collection {
  private readonly coinService = inject(CoinService);
  private readonly countryService = inject(CountryService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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

  protected readonly denominations = DENOMINATIONS;
  protected readonly sortColumns = COIN_SORT_COLUMNS;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
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

  protected readonly query = computed<CoinListQuery>(() => {
    const denomination = this.denomination();
    const commemorative = this.isCommemorative();
    const { sort, dir } = this.sortState();
    return {
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
      pageSize: toPageSize(this.pageSize()),
    };
  });

  protected readonly hasFilters = computed(() => {
    const q = this.query();
    return !!(
      q.denomination ||
      q.countryCode ||
      q.year ||
      q.isCommemorative !== undefined ||
      q.search
    );
  });

  protected readonly result = signal<PagedResponse<Coin> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  /** Coin whose photos are shown fullscreen. */
  protected readonly viewerCoin = signal<Coin | null>(null);

  protected readonly searchControl = new FormControl('', { nonNullable: true });

  constructor() {
    this.countryService.load();

    // Reload whenever the URL query changes; switchMap cancels outdated requests
    toObservable(this.query)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(false);
        }),
        switchMap((query) =>
          this.coinService.list(query).pipe(
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

  protected countryName(code: string): string {
    return this.countryService.name(code);
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
    // Keep the chosen sort order
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: this.sort() ?? null, dir: this.dir() ?? null },
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
