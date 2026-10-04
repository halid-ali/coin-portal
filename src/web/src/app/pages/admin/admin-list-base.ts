import { Directive, computed, inject, input } from '@angular/core';
import { NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelative,
} from '../../core/admin/admin-format';
import { parseAdminPageSize, parsePage } from '../../core/admin/admin-list';
import { ADMIN_DEFAULT_PAGE_SIZE, ADMIN_PAGE_SIZES } from '../../core/admin/admin.models';
import { PagedResponse } from '../../core/coins/coin.models';
import { firstQueryParam } from '../../core/http/query-params';
import { LanguageService } from '../../core/i18n/language.service';
import { scrollToTop } from '../../shared/motion';
import { SEARCH_MAX_LENGTH, normalizeSearch, syncSearchWithUrl } from '../../shared/url-search';

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

  readonly search = input(undefined, { transform: firstQueryParam });
  readonly page = input(undefined, { transform: firstQueryParam });
  readonly pageSize = input(undefined, { transform: firstQueryParam });

  protected readonly searchValue = computed(() => normalizeSearch(this.search()) || undefined);
  protected readonly pageNumber = computed(() => parsePage(this.page()));
  protected readonly pageSizeValue = computed(() => parseAdminPageSize(this.pageSize()));
  protected readonly pageSizes = ADMIN_PAGE_SIZES;
  protected readonly searchMaxLength = SEARCH_MAX_LENGTH;
  protected readonly searchControl = inject(NonNullableFormBuilder).control('');

  constructor() {
    syncSearchWithUrl(this.searchControl, this.search, (search) => this.setFilters({ search }));
  }

  /**
   * A page past the last one (its last row was deleted, or an old link) comes back empty: go to
   * the last page instead of showing an empty list without paging. True when it navigated.
   */
  protected leftPastLastPage(result: PagedResponse<unknown> | null): boolean {
    if (!result || result.totalCount === 0 || result.page <= result.totalPages) {
      return false;
    }
    this.navigate({ page: result.totalPages > 1 ? result.totalPages : null }, true);
    return true;
  }

  /** Changing a filter or the sort goes back to page 1. */
  protected setFilters(params: Record<string, QueryParamValue>): void {
    this.navigate({ ...params, page: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ page: page > 1 ? page : null });
    // The bottom pagination is far from the list start
    scrollToTop();
  }

  protected setPageSize(size: number): void {
    this.setFilters({ pageSize: size === ADMIN_DEFAULT_PAGE_SIZE ? null : size });
  }

  protected navigate(params: Record<string, QueryParamValue>, replaceUrl = false): void {
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
    return formatNumber(value, this.language.current());
  }
}
