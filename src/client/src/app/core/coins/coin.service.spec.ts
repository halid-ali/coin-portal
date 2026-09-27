import { Coin } from './coin.models';
import { photoUrl, primaryPhoto, toListParams } from './coin.service';

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

describe('photo helpers', () => {
  const national = { side: 'National' as const, id: 'a1' };
  const common = { side: 'Common' as const, id: 'b2' };

  it('builds versioned photo URLs', () => {
    expect(photoUrl(7, common, 'thumb')).toBe('/api/coins/7/photos/common/thumb?v=b2');
  });

  it('prefers the national side as primary photo', () => {
    const coin = (photos: Coin['photos']) => ({ photos }) as Coin;
    expect(primaryPhoto(coin([common, national]))).toBe(national);
    expect(primaryPhoto(coin([common]))).toBe(common);
    expect(primaryPhoto(coin([]))).toBeUndefined();
  });
});
