import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthService } from '../../core/auth/auth.service';
import { Coin, PagedResponse } from '../../core/coins/coin.models';
import { CollectionReturn } from '../../core/coins/collection-return';
import { Collection as CoinCollection } from '../../core/collections/collection.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { Collection } from './collection';

const collection = (coinCount: number, more: Partial<CoinCollection> = {}): CoinCollection => ({
  id: 5,
  name: 'Koleksiyonum',
  description: null,
  visibility: 'Private',
  coinCount,
  photographedCoinCount: 0,
  minPublicCoins: 10,
  canBePublic: false,
  coverImageId: null,
  moderationLocked: false,
  shareToken: null,
  createdAtUtc: '2026-10-01T12:00:00Z',
  updatedAtUtc: '2026-10-01T12:00:00Z',
  ...more,
});

const coin: Coin = {
  id: 1,
  collectionId: 5,
  title: 'Brandenburger Tor',
  description: null,
  kind: 'Euro',
  denomination: 'Euro2',
  faceValue: null,
  currency: null,
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
  let confirm: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    confirm = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ConfirmDialogService, useValue: { confirm } },
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
  async function open(
    path: string,
    coinCount: number,
    coins: PagedResponse<Coin>,
    more: Partial<CoinCollection> = {},
    countries: string[] = [],
  ) {
    await harness.navigateByUrl(path);
    http.match('/api/countries').forEach((r) => r.flush(countries.map((code) => ({ code }))));
    // A sorted list waits for the countries (their display order)
    await harness.fixture.whenStable();
    http.expectOne('/api/collections/5').flush(collection(coinCount, more));
    latestCoinRequest().flush(coins);
    await harness.fixture.whenStable();
  }

  /** The coin list request still open (switchMap cancelled the older ones). */
  function latestCoinRequest() {
    const open = http.match((r) => r.url === '/api/coins').filter((r) => !r.cancelled);
    expect(open).toHaveLength(1);
    return open[0];
  }

  const banner = () => page().querySelector('section[aria-labelledby=publication-title]');

  it('shows how far a private collection is from public, linking the coins without photos', async () => {
    await open('/collections/5', 3, pageWithCoin(), { photographedCoinCount: 1 });

    expect(banner()!.textContent).toContain('Koleksiyonunu yayına almak için');
    expect(banner()!.textContent).toContain('1/10 fotoğraflı coin');
    expect(banner()!.textContent).toContain('Bu arada linkle paylaşabilirsin.');
    const missing = banner()!.querySelector('a')!;
    expect(missing.textContent).toContain("2 coin'in ulusal yüzü eksik");
    expect(missing.getAttribute('href')).toBe('/collections/5?photo=missing');
    // Each part apart from the dots (the template drops the spaces between elements)
    expect(banner()!.textContent!.replace(/\s+/g, ' ')).toContain(
      "1/10 fotoğraflı coin · 2 coin'in ulusal yüzü eksik · Bu arada linkle paylaşabilirsin.",
    );
  });

  it('leaves out the link tip and grays out Add coin at the limit while unverified', async () => {
    const loaded = TestBed.inject(AuthService).loadMe();
    http.expectOne('/api/auth/me').flush({
      id: '1',
      userName: 'alice',
      email: 'alice@example.com',
      emailConfirmed: false,
      unverifiedMaxCoins: 20,
      unverifiedDeletionDueUtc: null,
      firstName: 'Alice',
      lastName: 'Smith',
      birthDate: '1990-01-01',
      language: null,
      theme: null,
      accent: null,
      previousSignInAtUtc: null,
      roles: [],
    });
    await loaded;
    await open('/collections/5', 3, pageWithCoin(), { photographedCoinCount: 1 });
    // The coin limit counts the whole account
    http
      .expectOne('/api/coins/summary')
      .flush({ coinCount: 20, countryCount: 1, commemorativeCount: 0 });
    await harness.fixture.whenStable();

    expect(banner()!.textContent).toContain('1/10 fotoğraflı coin');
    expect(banner()!.textContent).not.toContain('linkle paylaşabilirsin');
    // 20 coins in the account: no link to the form, a gray button pointing at the reason
    const addCoin = [...page().querySelectorAll('a, button')].find((e) =>
      e.textContent!.includes('Coin ekle'),
    )!;
    expect(addCoin.tagName).toBe('BUTTON');
    expect(addCoin.getAttribute('aria-disabled')).toBe('true');
    expect(addCoin.getAttribute('aria-describedby')).toBe('email-limit-coins');
  });

  it('lists every coin without photos from the banner, whatever the filters', async () => {
    await open('/collections/5?search=tor&countryCode=DE&view=grid', 3, pageWithCoin(), {
      photographedCoinCount: 1,
    });

    // Search and filters would hide some of them; the view stays
    expect(banner()!.querySelector('a')!.getAttribute('href')).toBe(
      '/collections/5?photo=missing&view=grid',
    );
  });

  it('leaves out the link tip in a collection shared by link already', async () => {
    await open('/collections/5', 3, pageWithCoin(), {
      visibility: 'Unlisted',
      shareToken: 'token',
      photographedCoinCount: 3,
    });

    expect(banner()!.textContent).toContain('3/10 fotoğraflı coin');
    expect(banner()!.textContent).not.toContain('linkle paylaşabilirsin');
    expect(banner()!.querySelector('a')).toBeNull();
  });

  const publishButton = () =>
    [...banner()!.querySelectorAll('button')].find((b) =>
      b.textContent!.includes('Herkese açık yap'),
    )!;
  const ready = { photographedCoinCount: 10, canBePublic: true };

  it('makes a ready collection public with the banner button', async () => {
    await open('/collections/5', 10, pageWithCoin(), ready);

    publishButton().click();
    // Only the visibility: a name changed in another tab is not written back
    const request = await vi.waitFor(() => http.expectOne('/api/collections/5/publish'));
    expect(request.request.method).toBe('POST');
    expect(confirm).not.toHaveBeenCalled();
    request.flush(collection(10, { ...ready, visibility: 'Public' }));
    await harness.fixture.whenStable();

    expect(banner()).toBeNull();
  });

  it('asks before a collection shared by link loses its link', async () => {
    await open('/collections/5', 10, pageWithCoin(), {
      ...ready,
      visibility: 'Unlisted',
      shareToken: 'token',
    });
    confirm.mockResolvedValueOnce(false);

    publishButton().click();
    await vi.waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(confirm.mock.calls[0][0].title).toBe('Paylaşım linki çalışmayacak');
    http.expectNone('/api/collections/5/publish');

    confirm.mockResolvedValueOnce(true);
    publishButton().click();
    const request = await vi.waitFor(() => http.expectOne('/api/collections/5/publish'));
    request.flush(collection(10, { ...ready, visibility: 'Public' }));
    await harness.fixture.whenStable();
    expect(banner()).toBeNull();
  });

  it('shows the fresh counts when the collection is no longer ready', async () => {
    await open('/collections/5', 10, pageWithCoin(), ready);

    publishButton().click();
    const request = await vi.waitFor(() => http.expectOne('/api/collections/5/publish'));
    request.flush(
      { code: 'public_requirements', coinCount: 11, photographedCoinCount: 10, minPublicCoins: 10 },
      { status: 400, statusText: 'Bad Request' },
    );
    http.expectOne('/api/collections/5').flush(collection(11, { photographedCoinCount: 10 }));
    await harness.fixture.whenStable();

    expect(page().textContent).toContain('Sayılar güncellendi.');
    expect(banner()!.textContent).toContain("1 coin'in ulusal yüzü eksik");
  });

  it('shows no banner for a public collection', async () => {
    await open('/collections/5', 1, pageWithCoin(), { visibility: 'Public' });

    expect(banner()).toBeNull();
  });

  it('filters by photos from the URL', async () => {
    await harness.navigateByUrl('/collections/5?photo=missing');
    http.match('/api/countries').forEach((r) => r.flush([]));
    http.expectOne('/api/collections/5').flush(collection(3));
    const request = http.expectOne((r) => r.url === '/api/coins');

    expect(request.request.params.get('photographed')).toBe('false');
    request.flush(emptyPage(1, 0));
    await harness.fixture.whenStable();
    expect(page().querySelector('#photo')).not.toBeNull();
    expect(page().textContent).toContain('Filtreleri temizle');
  });

  // Written down before coins other than euro coins (roadmap 18): the euro list stays like this
  describe('euro coins', () => {
    const options = (id: string) =>
      [...page().querySelectorAll(`#${id} option`)].map((o) => [
        o.getAttribute('value'),
        o.textContent!.trim(),
      ]);

    it('offers the euro denominations and the countries by name as filters', async () => {
      await open('/collections/5', 1, pageWithCoin(), {}, ['DE', 'AT']);

      expect(options('denomination')).toEqual([
        ['', 'Tümü'],
        ['Euro2', '2 €'],
        ['Euro1', '1 €'],
        ['Cent50', '50 cent'],
        ['Cent20', '20 cent'],
        ['Cent10', '10 cent'],
        ['Cent5', '5 cent'],
        ['Cent2', '2 cent'],
        ['Cent1', '1 cent'],
      ]);
      expect(options('country')).toEqual([
        ['', 'Tümü'],
        ['DE', 'Almanya'],
        ['AT', 'Avusturya'],
      ]);
    });

    it('puts the chosen denomination and country in the URL and the request', async () => {
      await open('/collections/5', 1, pageWithCoin(), {}, ['DE', 'AT']);
      const choose = async (id: string, value: string) => {
        const select = page().querySelector<HTMLSelectElement>(`#${id}`)!;
        select.value = value;
        select.dispatchEvent(new Event('change'));
        await harness.fixture.whenStable();
      };

      await choose('denomination', 'Cent10');
      expect(url()).toBe('/collections/5?denomination=Cent10');
      latestCoinRequest().flush(pageWithCoin());
      await choose('country', 'AT');
      expect(url()).toBe('/collections/5?denomination=Cent10&countryCode=AT');

      const params = latestCoinRequest().request.params;
      expect([params.get('denomination'), params.get('countryCode')]).toEqual(['Cent10', 'AT']);
    });

    it('shows the denomination, country and year of each coin in the table', async () => {
      await open('/collections/5', 1, pageWithCoin(), {}, ['DE']);

      const cells = [...page().querySelectorAll('table tbody tr td')].map((td) =>
        td.textContent!.trim(),
      );
      expect(cells.slice(1, 5)).toEqual(['Brandenburger Tor', '2 €', 'Almanya', '2016']);
    });
  });

  it('hides search and filters in an empty collection', async () => {
    await open('/collections/5', 0, emptyPage(1, 0));

    expect(page().querySelector('#search')).toBeNull();
    expect(page().querySelector('#denomination')).toBeNull();
    expect(page().textContent).toContain('Bu koleksiyonda henüz coin yok.');
    expect(page().textContent).toContain("İlk coin'ini ekle");
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

  it('loads a list sorted by country order once, after the countries', async () => {
    await harness.navigateByUrl('/collections/5?sort=Country');
    http.expectOne('/api/collections/5').flush(collection(3));
    await harness.fixture.whenStable();
    http.expectNone((r) => r.url === '/api/coins');

    http.expectOne('/api/countries').flush([
      { code: 'AT', name: 'Austria' },
      { code: 'DE', name: 'Germany' },
    ]);
    await harness.fixture.whenStable();

    // One request, cancelled ones included: none went out without the order
    const requests = http.match((r) => r.url === '/api/coins');
    expect(requests).toHaveLength(1);
    // Almanya before Avusturya
    expect(requests[0].request.params.get('countryOrder')).toBe('DE,AT');
  });

  it('loads a sorted list without the order when the countries fail', async () => {
    await harness.navigateByUrl('/collections/5?sort=Year');
    http.expectOne('/api/collections/5').flush(collection(3));
    http.expectOne('/api/countries').flush(null, { status: 500, statusText: 'Error' });
    await harness.fixture.whenStable();

    const request = latestCoinRequest();
    expect(request.request.params.get('sort')).toBe('Year');
    expect(request.request.params.has('countryOrder')).toBe(false);
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
