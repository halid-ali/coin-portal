import { nextAdminSort, parseAdminPageSize, parseAdminSort, parsePage } from './admin-list';

type Column = 'CreatedAt' | 'UserName';

describe('nextAdminSort', () => {
  it('starts another column in its own first direction', () => {
    const current = { sort: 'CreatedAt' as Column, dir: 'Desc' as const };
    expect(nextAdminSort(current, 'UserName', 'Asc')).toEqual({ sort: 'UserName', dir: 'Asc' });
  });

  it('flips the same column, without a "no sort" step', () => {
    const desc = { sort: 'CreatedAt' as Column, dir: 'Desc' as const };
    const asc = nextAdminSort(desc, 'CreatedAt', 'Desc');
    expect(asc).toEqual({ sort: 'CreatedAt', dir: 'Asc' });
    expect(nextAdminSort(asc, 'CreatedAt', 'Desc')).toEqual(desc);
  });
});

describe('parseAdminSort', () => {
  const columns: readonly Column[] = ['CreatedAt', 'UserName'];
  const fallback = { sort: 'CreatedAt' as Column, dir: 'Desc' as const };

  it('reads known columns and directions', () => {
    expect(parseAdminSort('UserName', 'Asc', columns, fallback)).toEqual({
      sort: 'UserName',
      dir: 'Asc',
    });
  });

  it('falls back on anything else', () => {
    expect(parseAdminSort(undefined, undefined, columns, fallback)).toEqual(fallback);
    expect(parseAdminSort('Storage', 'Asc', columns, fallback)).toEqual(fallback);
    expect(parseAdminSort('UserName', 'up', columns, fallback)).toEqual({
      sort: 'UserName',
      dir: 'Desc',
    });
  });
});

describe('URL paging values', () => {
  it('reads valid pages and sizes only', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('x')).toBe(1);
    expect(parseAdminPageSize('50')).toBe(50);
    expect(parseAdminPageSize('7')).toBe(25);
    expect(parseAdminPageSize(undefined)).toBe(25);
  });
});
