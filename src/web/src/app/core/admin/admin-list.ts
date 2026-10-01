import { SortDirection } from '../coins/coin.models';
import { ADMIN_DEFAULT_PAGE_SIZE, ADMIN_PAGE_SIZES } from './admin.models';

export interface AdminSortState<T extends string> {
  sort: T;
  dir: SortDirection;
}

/**
 * Header click in the admin lists: another column starts in its own first direction (newest or
 * largest first for dates and sizes, A → Z for names), the same column flips. There is no "no
 * sort" state: every list has a default column.
 */
export function nextAdminSort<T extends string>(
  current: AdminSortState<T>,
  column: T,
  firstDirection: SortDirection,
): AdminSortState<T> {
  if (current.sort !== column) {
    return { sort: column, dir: firstDirection };
  }
  return { sort: column, dir: current.dir === 'Asc' ? 'Desc' : 'Asc' };
}

/** URL value -> sort state; unknown columns and directions fall back to the default. */
export function parseAdminSort<T extends string>(
  sort: string | undefined,
  dir: string | undefined,
  columns: readonly T[],
  fallback: AdminSortState<T>,
): AdminSortState<T> {
  const column = columns.find((c) => c === sort);
  if (!column) {
    return fallback;
  }
  return { sort: column, dir: dir === 'Asc' || dir === 'Desc' ? dir : fallback.dir };
}

/** URL value -> page number (1 when missing or invalid). */
export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** URL value -> one of the admin page sizes. */
export function parseAdminPageSize(value: string | undefined): number {
  const n = Number(value);
  return ADMIN_PAGE_SIZES.includes(n) ? n : ADMIN_DEFAULT_PAGE_SIZE;
}
