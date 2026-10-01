import { Directive, computed, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';

import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatRelative,
} from '../../core/admin/admin-format';
import { parseAdminPageSize, parsePage } from '../../core/admin/admin-list';
import { ADMIN_DEFAULT_PAGE_SIZE, ADMIN_PAGE_SIZES } from '../../core/admin/admin.models';
import { LanguageService } from '../../core/i18n/language.service';

export type QueryParamValue = string | number | boolean | null;

/**
 * Shared parts of the admin lists. As everywhere, the URL is the single source of truth: search,
 * filters, sort and page are query params bound to inputs, defaults stay out of the URL.
 */
@Directive()
export abstract class AdminListBase {
  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  protected readonly language = inject(LanguageService);

  readonly search = input<string>();
  readonly page = input<string>();
  readonly pageSize = input<string>();

  protected readonly pageNumber = computed(() => parsePage(this.page()));
  protected readonly pageSizeValue = computed(() => parseAdminPageSize(this.pageSize()));
  protected readonly pageSizes = ADMIN_PAGE_SIZES;
  protected readonly searchControl = inject(NonNullableFormBuilder).control('');

  constructor() {
    // Keep the search box in sync with the URL (back/forward)
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

  /** Changing a filter or the sort goes back to page 1. */
  protected setFilters(params: Record<string, QueryParamValue>): void {
    this.navigate({ ...params, page: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ page: page > 1 ? page : null });
    // The bottom pagination is far from the list start
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected setPageSize(size: number): void {
    this.setFilters({ pageSize: size === ADMIN_DEFAULT_PAGE_SIZE ? null : size });
  }

  protected navigate(params: Record<string, QueryParamValue>): void {
    // Empty strings and nulls remove the param from the URL
    const queryParams = Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, value === '' ? null : value]),
    );
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }

  // Formatting in the UI language (templates re-render when it changes)
  protected date(iso: string): string {
    return formatDate(iso, this.language.current());
  }

  protected dateTime(iso: string): string {
    return formatDateTime(iso, this.language.current());
  }

  protected relative(iso: string): string {
    return formatRelative(iso, this.language.current());
  }

  protected bytes(value: number): string {
    return formatBytes(value, this.language.current());
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.language.current()).format(value);
  }
}
