import {
  ElementRef,
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, translate } from '@jsverse/transloco';
import { catchError, firstValueFrom, of, switchMap, tap } from 'rxjs';

import { AdminSortState, nextAdminSort, parseAdminSort } from '../../core/admin/admin-list';
import {
  ADMIN_NOTE_MAX_LENGTH,
  ADMIN_USER_STATUSES,
  AdminDeleteUsersResult,
  AdminUser,
  AdminUserQuery,
  AdminUserSort,
} from '../../core/admin/admin.models';
import { AdminService } from '../../core/admin/admin.service';
import { PagedResponse, SortDirection } from '../../core/coins/coin.models';
import { firstQueryParam } from '../../core/http/query-params';
import { PluralPipe, plural } from '../../core/i18n/plural';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { Pagination } from '../../shared/pagination/pagination';
import { SortHeader } from '../../shared/sort-header/sort-header';
import { AdminListBase } from './admin-list-base';
import { AdminStatusBadge } from './admin-status-badge';
import { UnverifiedMark } from './unverified-mark';

/** Sortable columns with the direction of their first click (the mobile select uses that one). */
const SORTS: readonly { value: AdminUserSort; first: SortDirection }[] = [
  { value: 'CreatedAt', first: 'Desc' },
  { value: 'UserName', first: 'Asc' },
  { value: 'LastSeen', first: 'Desc' },
  { value: 'Storage', first: 'Desc' },
];
const DEFAULT_SORT: AdminSortState<AdminUserSort> = { sort: 'CreatedAt', dir: 'Desc' };

/**
 * Admin > Users: search, status and e-mail filters, sortable table (cards on narrow screens),
 * paging, and deleting the users selected on the page at once (spam accounts; admins cannot be
 * selected, the API skips them anyway).
 */
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
    UnverifiedMark,
  ],
  templateUrl: './admin-users.html',
})
export class AdminUsers extends AdminListBase {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly injector = inject(Injector);
  private readonly bulkStatus = viewChild<ElementRef<HTMLElement>>('bulkStatus');

  readonly status = input(undefined, { transform: firstQueryParam });
  readonly emailConfirmed = input(undefined, { transform: firstQueryParam });
  readonly sort = input(undefined, { transform: firstQueryParam });
  readonly dir = input(undefined, { transform: firstQueryParam });

  protected readonly statuses = ADMIN_USER_STATUSES;
  protected readonly sorts = SORTS;

  protected readonly statusValue = computed(() =>
    ADMIN_USER_STATUSES.find((s) => s === this.status()),
  );
  protected readonly emailValue = computed(() => {
    const value = this.emailConfirmed();
    return value === 'true' ? true : value === 'false' ? false : undefined;
  });
  protected readonly sortState = computed(() =>
    parseAdminSort(
      this.sort(),
      this.dir(),
      SORTS.map((s) => s.value),
      DEFAULT_SORT,
    ),
  );
  private readonly query = computed<AdminUserQuery>(() => ({
    search: this.searchValue(),
    status: this.statusValue(),
    emailConfirmed: this.emailValue(),
    sort: this.sortState().sort,
    dir: this.sortState().dir,
    page: this.pageNumber(),
    pageSize: this.pageSizeValue(),
  }));

  protected readonly result = signal<PagedResponse<AdminUser> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  /** Bumped after a bulk deletion: the same query again. */
  private readonly reloads = signal(0);

  /** Ids of the selected users on this page; cleared whenever the list loads again. */
  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly selectable = computed(() =>
    (this.result()?.items ?? []).filter((u) => !u.isAdmin).map((u) => u.id),
  );
  protected readonly selectedCount = computed(() => this.selected().size);
  protected readonly allSelected = computed(
    () => this.selectable().length > 0 && this.selectable().every((id) => this.selected().has(id)),
  );
  protected readonly someSelected = computed(() => this.selectedCount() > 0 && !this.allSelected());
  protected readonly deleting = signal(false);
  protected readonly bulkResult = signal<AdminDeleteUsersResult | null>(null);
  protected readonly bulkError = signal(false);

  constructor() {
    super();
    // Another view: the last bulk outcome belongs to the old one
    toObservable(this.query)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.bulkResult.set(null);
        this.bulkError.set(false);
      });
    toObservable(computed(() => ({ query: this.query(), reload: this.reloads() })))
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(false);
          this.selected.set(new Set());
        }),
        switchMap(({ query }) =>
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
        if (this.leftPastLastPage(result)) {
          return;
        }
        this.result.set(result);
        this.loading.set(false);
      });
  }

  /** The list's query params, so the detail page can come back to the same view. */
  protected listQueryParams(): Record<string, string> {
    return { ...this.route.snapshot.queryParams };
  }

  protected setEmail(value: string): void {
    this.setFilters({ emailConfirmed: value === 'true' || value === 'false' ? value : null });
  }

  protected toggle(id: string): void {
    const next = new Set(this.selected());
    if (!next.delete(id)) {
      next.add(id);
    }
    this.selected.set(next);
  }

  protected toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.selectable()));
  }

  /** For good: the number of accounts must be typed, like a name for one user. */
  protected async deleteSelected(): Promise<void> {
    const ids = [...this.selected()];
    if (this.deleting() || ids.length === 0) {
      return;
    }
    const lang = this.language.current();
    const note = await this.confirm.confirmWithNote({
      title: translate('admin.users.bulkDeleteTitle'),
      message: plural('admin.users.bulkDeleteMessage', ids.length, lang),
      confirmText: translate('admin.users.deleteSelected'),
      danger: true,
      typeToConfirm: { label: translate('admin.users.bulkDeleteType'), value: String(ids.length) },
      note: {
        label: translate('admin.note.label'),
        hint: translate('admin.note.hint'),
        maxLength: ADMIN_NOTE_MAX_LENGTH,
      },
    });
    if (note === null) {
      return;
    }
    this.deleting.set(true);
    this.bulkResult.set(null);
    this.bulkError.set(false);
    try {
      this.bulkResult.set(await firstValueFrom(this.admin.deleteUsers(ids, note)));
    } catch {
      this.bulkError.set(true);
    } finally {
      this.deleting.set(false);
      // Some may be gone even after a failure: the list says what is left
      this.reloads.update((n) => n + 1);
      afterNextRender(() => this.bulkStatus()?.nativeElement.focus(), { injector: this.injector });
    }
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
