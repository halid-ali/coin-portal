import { DEFAULT_PAGE_SIZE } from '../../core/coins/coin.models';
import { toInt, toPageSize, toPhotographed } from './collection-url';

describe('collection URL values', () => {
  it.each([
    ['2006', 2006],
    ['0', 0],
    ['-3', -3],
    ['2006.5', undefined],
    ['abc', undefined],
    ['', undefined],
    [undefined, undefined],
  ])('toInt(%s) is %s', (value, expected) => {
    expect(toInt(value)).toBe(expected);
  });

  // The API's photographed filter; anything else is no filter
  it.each([
    ['missing', false],
    ['complete', true],
    ['all', undefined],
    ['', undefined],
    [undefined, undefined],
  ])('toPhotographed(%s) is %s', (value, expected) => {
    expect(toPhotographed(value)).toBe(expected);
  });

  // Only the offered sizes; "all" is 0, anything else the default
  it.each([
    ['25', 25],
    ['all', 0],
    ['0', DEFAULT_PAGE_SIZE],
    ['7', DEFAULT_PAGE_SIZE],
    ['1000000', DEFAULT_PAGE_SIZE],
    [undefined, DEFAULT_PAGE_SIZE],
  ])('toPageSize(%s) is %s', (value, expected) => {
    expect(toPageSize(value)).toBe(expected);
  });
});
