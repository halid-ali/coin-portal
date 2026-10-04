import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('keeps paths inside the app', () => {
    expect(safeReturnUrl('/collections/5?view=grid')).toBe('/collections/5?view=grid');
  });

  // Each of these would send a user who just signed in to another site
  it.each(['//evil.example', 'https://evil.example', 'evil.example/x'])(
    'turns %s into the home page',
    (url) => {
      expect(safeReturnUrl(url)).toBe('/');
    },
  );

  it('uses the home page without a value', () => {
    expect(safeReturnUrl(null)).toBe('/');
    expect(safeReturnUrl(undefined)).toBe('/');
    expect(safeReturnUrl('')).toBe('/');
  });
});
