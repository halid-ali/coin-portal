import { SortDirection } from '../coins/coin.models';
import { ComboboxOption } from '../../shared/combobox/combobox-filter';
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

/**
 * An admin filter or sort box's options: the values and their names in the same order. The names
 * come from the panel's texts (translateSignal: '' until they load, again in a new language).
 */
export function namedOptions(
  values: readonly string[],
  names: readonly string[],
): ComboboxOption[] {
  return values.map((value, i) => ({ value, label: names[i] ?? '' }));
}

/**
 * The sort box's value: the column while the list is sorted in its first direction (the box's
 * options), otherwise '' (a header turned it around on a wide screen): the box then reads "Sort".
 */
export function sortOptionValue<T extends string>(
  state: AdminSortState<T>,
  sorts: readonly { value: T; first: SortDirection }[],
): string {
  return sorts.some((s) => s.value === state.sort && s.first === state.dir) ? state.sort : '';
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
