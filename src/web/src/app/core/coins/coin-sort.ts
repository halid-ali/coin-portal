import { CoinSort, CoinSortColumn, SortDirection, isSortColumn } from './coin.models';

export interface SortState {
  sort: CoinSort;
  dir: SortDirection;
}

export const DEFAULT_SORT: SortState = { sort: 'Newest', dir: 'Asc' };

/** Header click cycle: ascending -> descending -> back to the default order. */
export function nextSort(current: SortState, column: CoinSortColumn): SortState {
  if (current.sort !== column) {
    return { sort: column, dir: 'Asc' };
  }
  return current.dir === 'Asc' ? { sort: column, dir: 'Desc' } : DEFAULT_SORT;
}

/** Sort and direction as the URL or the phone's sort select give them; anything unknown is the default. */
export function parseSort(
  sort: string | null | undefined,
  dir: string | null | undefined,
): SortState {
  return isSortColumn(sort) ? { sort, dir: dir === 'Desc' ? 'Desc' : 'Asc' } : DEFAULT_SORT;
}
