import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, of, switchMap, tap } from 'rxjs';

import { AdminSortState, nextAdminSort, parseAdminSort } from '../../core/admin/admin-list';
import {
  ADMIN_USER_STATUSES,
  AdminUser,
  AdminUserQuery,
  AdminUserSort,
} from '../../core/admin/admin.models';
import { AdminService } from '../../core/admin/admin.service';
import { PagedResponse, SortDirection } from '../../core/coins/coin.models';
import { PluralPipe } from '../../core/i18n/plural';
import { Pagination } from '../../shared/pagination/pagination';
import { SortHeader } from '../../shared/sort-header/sort-header';
import { AdminListBase } from './admin-list-base';
import { AdminStatusBadge } from './admin-status-badge';

/** Sortable columns with the direction of their first click (the mobile select uses that one). */
const SORTS: readonly { value: AdminUserSort; first: SortDirection }[] = [
  { value: 'CreatedAt', first: 'Desc' },
  { value: 'UserName', first: 'Asc' },
  { value: 'LastSeen', first: 'Desc' },
  { value: 'Storage', first: 'Desc' },
];
const DEFAULT_SORT: AdminSortState<AdminUserSort> = { sort: 'CreatedAt', dir: 'Desc' };

/** Admin > Users: search, status filter, sortable table (cards on narrow screens), paging. */
@Component({
  selector: 'app-admin-users',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    PluralPipe,
    Pagination,
    SortHeader,
    AdminStatusBadge,
  ],
  templateUrl: './admin-users.html',
})
export class AdminUsers extends AdminListBase {
  private readonly admin = inject(AdminService);

  readonly status = input<string>();
  readonly sort = input<string>();
  readonly dir = input<string>();

  protected readonly statuses = ADMIN_USER_STATUSES;
  protected readonly sorts = SORTS;

  protected readonly statusValue = computed(() =>
    ADMIN_USER_STATUSES.find((s) => s === this.status()),
  );
  protected readonly sortState = computed(() =>
    parseAdminSort(
      this.sort(),
      this.dir(),
      SORTS.map((s) => s.value),
      DEFAULT_SORT,
    ),
  );
  private readonly query = computed<AdminUserQuery>(() => ({
    search: this.search()?.trim() || undefined,
    status: this.statusValue(),
    sort: this.sortState().sort,
    dir: this.sortState().dir,
    page: this.pageNumber(),
    pageSize: this.pageSizeValue(),
  }));

  protected readonly result = signal<PagedResponse<AdminUser> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  constructor() {
    super();
    toObservable(this.query)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(false);
        }),
        switchMap((query) =>
          this.admin.users(query).pipe(
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
  }

  /** The list's query params, so the detail page can come back to the same view. */
  protected listQueryParams(): Record<string, string> {
    return { ...this.route.snapshot.queryParams };
  }

  protected setStatus(value: string): void {
    this.setFilters({
      status: (ADMIN_USER_STATUSES as readonly string[]).includes(value) ? value : null,
    });
  }

  protected sortDirection(column: AdminUserSort): SortDirection | null {
    const state = this.sortState();
    return state.sort === column ? state.dir : null;
  }

  protected firstDirection(column: AdminUserSort): SortDirection {
    return SORTS.find((s) => s.value === column)!.first;
  }

  protected sortBy(column: AdminUserSort): void {
    this.applySort(nextAdminSort(this.sortState(), column, this.firstDirection(column)));
  }

  /** Mobile select: a column in its first direction. */
  protected setSortOption(value: string): void {
    const option = SORTS.find((s) => s.value === value);
    this.applySort(option ? { sort: option.value, dir: option.first } : DEFAULT_SORT);
  }

  private applySort({ sort, dir }: AdminSortState<AdminUserSort>): void {
    const isDefault = sort === DEFAULT_SORT.sort && dir === DEFAULT_SORT.dir;
    this.setFilters({ sort: isDefault ? null : sort, dir: isDefault ? null : dir });
  }
}
