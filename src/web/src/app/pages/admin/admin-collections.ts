import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, translate } from '@jsverse/transloco';
import { Observable, catchError, firstValueFrom, of, switchMap, tap } from 'rxjs';

import { AdminSortState, nextAdminSort, parseAdminSort } from '../../core/admin/admin-list';
import {
  ADMIN_NOTE_MAX_LENGTH,
  AdminCollection,
  AdminCollectionQuery,
  AdminCollectionSort,
} from '../../core/admin/admin.models';
import { AdminService } from '../../core/admin/admin.service';
import { PagedResponse, SortDirection } from '../../core/coins/coin.models';
import { firstQueryParam } from '../../core/http/query-params';
import { PluralPipe } from '../../core/i18n/plural';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { Pagination } from '../../shared/pagination/pagination';
import { SortHeader } from '../../shared/sort-header/sort-header';
import { VisibilityBadge } from '../../shared/visibility-badge/visibility-badge';
import { AdminListBase } from './admin-list-base';

/** The "show" filter (?show=…) and what it asks the API for. */
const SHOW_FILTERS = {
  public: { visibility: 'Public' },
  unlisted: { visibility: 'Unlisted' },
  hidden: { locked: true },
} as const satisfies Record<string, Partial<AdminCollectionQuery>>;
type ShowFilter = keyof typeof SHOW_FILTERS;
const SHOW_VALUES = Object.keys(SHOW_FILTERS) as ShowFilter[];

const SORTS: readonly { value: AdminCollectionSort; first: SortDirection }[] = [
  { value: 'UpdatedAt', first: 'Desc' },
  { value: 'Name', first: 'Asc' },
  { value: 'CoinCount', first: 'Desc' },
];
const DEFAULT_SORT: AdminSortState<AdminCollectionSort> = { sort: 'UpdatedAt', dir: 'Desc' };

/**
 * Admin > Collections: the shared ones (public, link only) and the ones an admin has hidden.
 * Hiding makes a collection private and locks it against sharing; private collections are not
 * listed (the panel sees no private content).
 */
@Component({
  selector: 'app-admin-collections',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    PluralPipe,
    Pagination,
    SortHeader,
    VisibilityBadge,
  ],
  templateUrl: './admin-collections.html',
})
export class AdminCollections extends AdminListBase {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly show = input(undefined, { transform: firstQueryParam });
  readonly sort = input(undefined, { transform: firstQueryParam });
  readonly dir = input(undefined, { transform: firstQueryParam });

  protected readonly showValues = SHOW_VALUES;
  protected readonly sorts = SORTS;

  protected readonly showValue = computed(() => SHOW_VALUES.find((s) => s === this.show()));
  protected readonly sortState = computed(() =>
    parseAdminSort(
      this.sort(),
      this.dir(),
      SORTS.map((s) => s.value),
      DEFAULT_SORT,
    ),
  );
  private readonly reloads = signal(0);
  private readonly query = computed<AdminCollectionQuery>(() => {
    const show = this.showValue();
    this.reloads();
    return {
      search: this.searchValue(),
      ...(show ? SHOW_FILTERS[show] : {}),
      sort: this.sortState().sort,
      dir: this.sortState().dir,
      page: this.pageNumber(),
      pageSize: this.pageSizeValue(),
    };
  });

  protected readonly result = signal<PagedResponse<AdminCollection> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  /** Id of the collection whose action is running. */
  protected readonly busyId = signal<number | null>(null);
  protected readonly actionError = signal(false);

  /**
   * Private collections that are not hidden: never listed here, only counted, so the overview's
   * total and this list do not look contradictory. Null until the numbers arrive (or if they fail).
   */
  protected readonly privateCount = signal<number | null>(null);

  constructor() {
    super();
    toObservable(this.query)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(false);
        }),
        switchMap((query) =>
          this.admin.collections(query).pipe(
            catchError(() => {
              this.loadError.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (this.leftPastLastPage(result)) {
          return;
        }
        this.result.set(result);
        this.loading.set(false);
      });

    // Hidden collections are private too, but they are listed
    this.admin
      .stats()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (s) =>
          this.privateCount.set(
            s.collectionCount -
              s.publicCollectionCount -
              s.unlistedCollectionCount -
              s.hiddenCollectionCount,
          ),
        error: () => this.privateCount.set(null),
      });
  }

  /**
   * Where others see the collection. Hidden ones are private, and nobody sees the collections of
   * a locked owner (the page would be a 404), so there is none.
   */
  protected viewLink(c: AdminCollection): string[] | null {
    if (c.moderationLockedAtUtc || c.ownerLocked) {
      return null;
    }
    if (c.visibility === 'Public') {
      return ['/u', c.ownerUserName, String(c.id)];
    }
    return c.visibility === 'Unlisted' && c.shareToken ? ['/s', c.shareToken] : null;
  }

  protected setShow(value: string): void {
    this.setFilters({ show: (SHOW_VALUES as string[]).includes(value) ? value : null });
  }

  protected sortDirection(column: AdminCollectionSort): SortDirection | null {
    const state = this.sortState();
    return state.sort === column ? state.dir : null;
  }

  protected firstDirection(column: AdminCollectionSort): SortDirection {
    return SORTS.find((s) => s.value === column)!.first;
  }

  protected sortBy(column: AdminCollectionSort): void {
    this.applySort(nextAdminSort(this.sortState(), column, this.firstDirection(column)));
  }

  protected setSortOption(value: string): void {
    const option = SORTS.find((s) => s.value === value);
    this.applySort(option ? { sort: option.value, dir: option.first } : DEFAULT_SORT);
  }

  private applySort({ sort, dir }: AdminSortState<AdminCollectionSort>): void {
    const isDefault = sort === DEFAULT_SORT.sort && dir === DEFAULT_SORT.dir;
    this.setFilters({ sort: isDefault ? null : sort, dir: isDefault ? null : dir });
  }

  protected async hide(c: AdminCollection): Promise<void> {
    const note = await this.confirm.confirmWithNote({
      title: translate('admin.collections.hideTitle'),
      message: translate('admin.collections.hideMessage', { name: c.name }),
      confirmText: translate('admin.collections.hide'),
      danger: true,
      note: this.noteField(),
    });
    if (note !== null) {
      await this.run(c.id, () => this.admin.lockCollection(c.id, note));
    }
  }

  protected async unhide(c: AdminCollection): Promise<void> {
    const note = await this.confirm.confirmWithNote({
      title: translate('admin.collections.unhideTitle'),
      message: translate('admin.collections.unhideMessage', { name: c.name }),
      confirmText: translate('admin.collections.unhide'),
      note: this.noteField(),
    });
    if (note !== null) {
      await this.run(c.id, () => this.admin.unlockCollection(c.id, note));
    }
  }

  private noteField() {
    return {
      label: translate('admin.note.label'),
      hint: translate('admin.note.hint'),
      maxLength: ADMIN_NOTE_MAX_LENGTH,
    };
  }

  private async run(id: number, action: () => Observable<void>): Promise<void> {
    this.busyId.set(id);
    this.actionError.set(false);
    try {
      await firstValueFrom(action(), { defaultValue: undefined });
      this.reloads.update((n) => n + 1);
    } catch {
      this.actionError.set(true);
    } finally {
      this.busyId.set(null);
    }
  }
}
