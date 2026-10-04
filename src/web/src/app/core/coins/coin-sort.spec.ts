import { DEFAULT_SORT, nextSort, parseSort } from './coin-sort';

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

describe('parseSort', () => {
  it.each([
    ['Year', 'Desc', { sort: 'Year', dir: 'Desc' }],
    ['Year', undefined, { sort: 'Year', dir: 'Asc' }],
    ['Year', 'sideways', { sort: 'Year', dir: 'Asc' }],
    // Not a sortable column (the API would refuse Quantity), or nothing at all
    ['Quantity', 'Desc', DEFAULT_SORT],
    ['Newest', undefined, DEFAULT_SORT],
    [undefined, undefined, DEFAULT_SORT],
  ])('reads %s / %s', (sort, dir, expected) => {
    expect(parseSort(sort, dir)).toEqual(expected);
  });
});
