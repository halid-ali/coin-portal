import { DEFAULT_SORT, nextSort } from './coin-sort';

describe('nextSort', () => {
  it('starts a new column ascending', () => {
    expect(nextSort(DEFAULT_SORT, 'Year')).toEqual({ sort: 'Year', dir: 'Asc' });
    expect(nextSort({ sort: 'Title', dir: 'Desc' }, 'Year')).toEqual({ sort: 'Year', dir: 'Asc' });
  });

  it('cycles the same column through descending back to the default', () => {
    const asc = nextSort(DEFAULT_SORT, 'Country');
    const desc = nextSort(asc, 'Country');
    expect(desc).toEqual({ sort: 'Country', dir: 'Desc' });
    expect(nextSort(desc, 'Country')).toEqual(DEFAULT_SORT);
  });
});
