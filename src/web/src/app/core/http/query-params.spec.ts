import { firstQueryParam } from './query-params';

describe('firstQueryParam', () => {
  it('keeps the first of repeated params', () => {
    expect(firstQueryParam(['a', 'b'])).toBe('a');
    expect(firstQueryParam('a')).toBe('a');
    expect(firstQueryParam([])).toBeUndefined();
    expect(firstQueryParam(null)).toBeUndefined();
    expect(firstQueryParam(undefined)).toBeUndefined();
  });
});
