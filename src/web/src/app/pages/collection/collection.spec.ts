import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { Coin, PagedResponse } from '../../core/coins/coin.models';
import { CollectionReturn } from '../../core/coins/collection-return';
import { Collection as CoinCollection } from '../../core/collections/collection.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Collection } from './collection';

const collection = (coinCount: number): CoinCollection => ({
  id: 5,
  name: 'Koleksiyonum',
  description: null,
  visibility: 'Private',
  coinCount,
  coverImageId: null,
  moderationLocked: false,
  shareToken: null,
  createdAtUtc: '2026-10-01T12:00:00Z',
  updatedAtUtc: '2026-10-01T12:00:00Z',
});

const coin: Coin = {
  id: 1,
  collectionId: 5,
  title: 'Brandenburger Tor',
  description: null,
  denomination: 'Euro2',
  countryCode: 'DE',
  year: 2016,
  mintMark: null,
  isCommemorative: true,
  quantity: 1,
  photos: [],
};

const pageWithCoin = (pageSize = 10): PagedResponse<Coin> => ({
  items: [coin],
  page: 1,
  pageSize,
  totalCount: 1,
  totalPages: 1,
});

const emptyPage = (page: number, totalCount: number, pageSize = 10): PagedResponse<Coin> => ({
  items: [],
  page,
  pageSize,
  totalCount,
  totalPages: pageSize === 0 ? 1 : Math.ceil(totalCount / pageSize),
});

describe('Collection', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'collections/:collectionId', component: Collection, data: { mode: 'owner' } },
            { path: 'u/:userName/:collectionId', component: Collection, data: { mode: 'public' } },
          ],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
      ],
    });
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  const page = () => harness.routeNativeElement!;
  const url = () => TestBed.inject(Router).url;

  /** Opens the page and answers its header and coin list requests. */
  async function open(path: string, coinCount: number, coins: PagedResponse<Coin>) {
    await harness.navigateByUrl(path);
    http.match('/api/countries').forEach((r) => r.flush([]));
    // A sorted list asks again once the countries (their display order) arrive
    await harness.fixture.whenStable();
    http.expectOne('/api/collections/5').flush(collection(coinCount));
    latestCoinRequest().flush(coins);
    await harness.fixture.whenStable();
  }

  /** The coin list request still open (switchMap cancelled the older ones). */
  function latestCoinRequest() {
    const open = http.match((r) => r.url === '/api/coins').filter((r) => !r.cancelled);
    expect(open).toHaveLength(1);
    return open[0];
  }

  it('hides search and filters in an empty collection', async () => {
    await open('/collections/5', 0, emptyPage(1, 0));

    expect(page().querySelector('#search')).toBeNull();
    expect(page().querySelector('#denomination')).toBeNull();
    expect(page().textContent).toContain('Bu koleksiyonda henüz coin yok.');
    expect(page().textContent).toContain('İlk coinini ekle');
  });

  it('shows search and filters when the collection has coins', async () => {
    await open('/collections/5', 1, pageWithCoin());

    expect(page().querySelector('#search')).not.toBeNull();
    expect(page().querySelector<HTMLInputElement>('#search')!.maxLength).toBe(100);
  });

  it('keeps the filters when ones in the URL match nothing', async () => {
    await open('/collections/5?denomination=Euro2', 0, emptyPage(1, 0));

    expect(page().querySelector('#denomination')).not.toBeNull();
    expect(page().textContent).toContain('Filtreleri temizle');
  });

  it('goes to the last page when the page is past it', async () => {
    await open('/collections/5?page=3&pageSize=25', 30, emptyPage(3, 30, 25));

    expect(url()).toBe('/collections/5?page=2&pageSize=25');
    const reload = http.expectOne((r) => r.url === '/api/coins');
    expect(reload.request.params.get('page')).toBe('2');
    // The empty page in between is not shown as an empty collection
    expect(page().textContent).not.toContain('henüz coin yok');
    reload.flush(emptyPage(2, 30, 25));
  });

  it('drops the page param when only one page is left', async () => {
    await open('/collections/5?page=2', 10, emptyPage(2, 10));

    expect(url()).toBe('/collections/5');
    http.expectOne((r) => r.url === '/api/coins').flush(emptyPage(1, 10));
  });

  it('keeps sort, page size and view when clearing the filters', async () => {
    await open(
      '/collections/5?search=euro&denomination=Euro2&sort=Year&dir=Desc&pageSize=25&view=grid',
      1,
      emptyPage(1, 0, 25),
    );

    const clear = [...page().querySelectorAll('button')].find((b) =>
      b.textContent!.includes('Filtreleri temizle'),
    )!;
    clear.click();
    await harness.fixture.whenStable();

    expect(url()).toBe('/collections/5?sort=Year&dir=Desc&pageSize=25&view=grid');
    http.expectOne((r) => r.url === '/api/coins').flush(pageWithCoin(25));
  });

  it('uses the first of repeated query params', async () => {
    await harness.navigateByUrl('/collections/5?search=a&search=b');
    http.match('/api/countries').forEach((r) => r.flush([]));
    http.expectOne('/api/collections/5').flush(collection(3));
    const request = http.expectOne((r) => r.url === '/api/coins');
    expect(request.request.params.get('search')).toBe('a');
    request.flush(emptyPage(1, 0));
  });

  it('tells a server error apart from a missing collection', async () => {
    await harness.navigateByUrl('/collections/5');
    http.match('/api/countries').forEach((r) => r.flush([]));
    http.expectOne('/api/collections/5').flush(null, { status: 500, statusText: 'Server Error' });
    http.expectOne((r) => r.url === '/api/coins').flush(emptyPage(1, 0));
    await harness.fixture.whenStable();

    expect(page().textContent).toContain('Beklenmeyen bir hata');
    expect(page().textContent).not.toContain('bulunamadı');
  });

  it('remembers only own collection pages as the way back from the coin form', async () => {
    await open('/collections/5?page=2', 30, emptyPage(2, 30));
    http.match((r) => r.url === '/api/coins').forEach((r) => r.flush(emptyPage(2, 30)));
    expect(TestBed.inject(CollectionReturn).url()).toBe('/collections/5?page=2');

    await harness.navigateByUrl('/u/elif.kaya/7');
    expect(TestBed.inject(CollectionReturn).url()).toBe('/collections/5?page=2');
    http.match(() => true).forEach((r) => r.flush(null, { status: 404, statusText: 'Not Found' }));
  });
});
