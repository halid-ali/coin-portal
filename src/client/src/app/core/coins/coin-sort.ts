import { CoinSort, CoinSortColumn, SortDirection } from './coin.models';

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
