import { toListParams } from './coin.service';

describe('toListParams', () => {
  it('skips empty values and stringifies the rest', () => {
    const params = toListParams({
      denomination: 'Euro2',
      countryCode: '',
      year: 2006,
      isCommemorative: false,
      search: undefined,
      page: 2,
    });

    expect(params.toString()).toBe('denomination=Euro2&year=2006&isCommemorative=false&page=2');
  });
});