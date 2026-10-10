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
import { SKELETON_DELAY_MS } from '../../shared/skeleton';
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
            { path: 'explore', component: Collection, data: { mode: 'explore' } },
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
  const filterBox = (id: string) => page().querySelector<HTMLInputElement>(`#${id}`)!;
  async function filterKey(id: string, key: string): Promise<void> {
    filterBox(id).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await harness.fixture.whenStable();
  }
  /** A filter's list as it opens, by its box's id; the list is open afterwards. */
  async function openFilter(id: string): Promise<HTMLElement> {
    filterBox(id).click();
    await harness.fixture.whenStable();
    return filterBox(id).parentElement!;
  }
  /** A filter's option names (the list closed again). */
  async function options(id: string): Promise<string[]> {
    const list = await openFilter(id);
    const names = [...list.querySelectorAll('[role=option]')].map((o) => o.textContent!.trim());
    await filterKey(id, 'Escape');
    return names;
  }
  /** Opens a filter's list and clicks an option by its name (also for a list without typing). */
  async function pickFilter(id: string, name: string): Promise<void> {
    const list = await openFilter(id);
    const option = [...list.querySelectorAll<HTMLElement>('[role=option]')].find(
      (o) => o.textContent!.trim() === name,
    )!;
    option.click();
    await harness.fixture.whenStable();
  }
  /** Types into a filter's box and picks the first match. */
  async function chooseFilter(id: string, typed: string): Promise<void> {
    filterBox(id).focus();
    filterBox(id).value = typed;
    filterBox(id).dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    await filterKey(id, 'Enter');
  }
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
    expect(missing.textContent).toContain("2 coin'in fotoğrafı eksik");
    expect(missing.getAttribute('href')).toBe('/collections/5?photo=missing');
    // Each part apart from the dots (the template drops the spaces between elements)
    expect(banner()!.textContent!.replace(/\s+/g, ' ')).toContain(
      "1/10 fotoğraflı coin · 2 coin'in fotoğrafı eksik · Bu arada linkle paylaşabilirsin.",
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
    expect(banner()!.textContent).toContain("1 coin'in fotoğrafı eksik");
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
    expect(filterBox('photo').textContent!.trim()).toBe('Fotoğrafı eksik');
    expect(page().textContent).toContain('Filtreleri temizle');
  });

  it('offers the commemorative and photo filters and puts the choice in the URL', async () => {
    await open('/collections/5', 1, pageWithCoin());

    expect(await options('commemorative')).toEqual(['Tümü', 'Sadece hatıra', 'Hatıra olmayanlar']);
    expect(await options('photo')).toEqual(['Tümü', 'Fotoğrafı eksik', 'Fotoğrafları tam']);
    // Short fixed lists: nothing to type (user choice 2026-10-10)
    expect(filterBox('commemorative').tagName).toBe('BUTTON');
    expect(filterBox('photo').tagName).toBe('BUTTON');

    await pickFilter('commemorative', 'Hatıra olmayanlar');
    expect(url()).toBe('/collections/5?isCommemorative=false');
    expect(latestCoinRequest().request.params.get('isCommemorative')).toBe('false');
  });

  // Written down before coins other than euro coins (roadmap 18): the euro list stays like this
  describe('euro coins', () => {
    it('offers the euro denominations and the countries by name as filters', async () => {
      await open('/collections/5', 1, pageWithCoin(), {}, ['DE', 'AT']);

      // Lists to type in since 2026-10-09 (were selects with these options and their values)
      expect(await options('denomination')).toEqual([
        'Tümü',
        '2 €',
        '1 €',
        '50 cent',
        '20 cent',
        '10 cent',
        '5 cent',
        '2 cent',
        '1 cent',
      ]);
      expect(await options('country')).toEqual(['Tümü', 'Almanya', 'Avusturya']);
    });

    it('puts the chosen denomination and country in the URL and the request', async () => {
      await open('/collections/5', 1, pageWithCoin(), {}, ['DE', 'AT']);
      await chooseFilter('denomination', '10 c');
      expect(url()).toBe('/collections/5?denomination=Cent10');
      latestCoinRequest().flush(pageWithCoin());
      await chooseFilter('country', 'Avus');
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

  describe('euro and other coins', () => {
    const otherCoin: Coin = {
      ...coin,
      id: 2,
      title: '25 kuruş · Türkiye · 1975',
      kind: 'Other',
      denomination: null,
      faceValue: 25,
      currency: 'kuruş',
      countryCode: 'TR',
      year: 1975,
    };
    const mixedPage: PagedResponse<Coin> = {
      ...pageWithCoin(),
      items: [coin, otherCoin],
      totalCount: 2,
    };
    const mixed = {
      euroCount: 2,
      otherCount: 1,
      currencies: ['kuruş'],
      countryCodes: ['DE', 'TR'],
    };
    const kindButtons = () =>
      [...page().querySelectorAll('[aria-label="Coin türü"] button')].map((b) => [
        b.textContent!.replace(/\s+/g, ' ').trim(),
        b.getAttribute('aria-pressed'),
      ]);

    function flushFacets(facets: object, kind?: string) {
      const request = http.expectOne((r) => r.url === '/api/coins/facets');
      expect(request.request.params.get('collectionId')).toBe('5');
      expect(request.request.params.get('kind')).toBe(kind ?? null);
      request.flush(facets);
    }

    async function openMixed(path = '/collections/5') {
      await open(path, 3, mixedPage, {}, ['DE', 'AT', 'TR']);
      flushFacets(mixed, path.includes('kind=Other') ? 'Other' : undefined);
      await harness.fixture.whenStable();
    }

    it('shows the kind buttons with their counts where both kinds are', async () => {
      await openMixed();

      expect(kindButtons()).toEqual([
        ['Tümü 3', 'true'],
        ['Euro 2', 'false'],
        ['Dünya 1', 'false'],
      ]);
      // Only the countries the collection has
      expect(await options('country')).toEqual(['Tümü', 'Almanya', 'Türkiye']);
      // The currencies under their own heading
      const groups = [...(await openFilter('denomination')).querySelectorAll('[role=group]')];
      expect(groups.map((g) => g.firstElementChild!.textContent!.trim())).toEqual([
        'Euro coin',
        "Dünya coin'i",
      ]);
      expect(
        [...groups[1].querySelectorAll('[role=option]')].map((o) => o.textContent!.trim()),
      ).toEqual(['kuruş']);
      await filterKey('denomination', 'Escape');
      // An other coin's value in the table
      const cells = [...page().querySelectorAll('table tbody tr')][1].querySelectorAll('td');
      expect(cells[2].textContent!.trim()).toBe('25 kuruş');
    });

    it('leaves the buttons out of a collection with one kind', async () => {
      await open('/collections/5', 1, pageWithCoin(), {}, ['DE']);
      flushFacets({ euroCount: 1, otherCount: 0, currencies: [], countryCodes: ['DE'] });
      await harness.fixture.whenStable();

      expect(page().querySelector('[role=group][aria-label="Coin türü"]')).toBeNull();
      expect((await openFilter('denomination')).querySelector('[role=group]')).toBeNull();
    });

    it('filters by kind, dropping the filters of the other kind', async () => {
      await openMixed('/collections/5?denomination=Euro2&countryCode=DE&year=2016');
      const other = [
        ...page().querySelectorAll<HTMLButtonElement>('[aria-label="Coin türü"] button'),
      ][2];

      other.click();
      await harness.fixture.whenStable();

      expect(url()).toBe('/collections/5?year=2016&kind=Other');
      const params = latestCoinRequest().request.params;
      expect([params.get('kind'), params.get('denomination')]).toEqual(['Other', null]);
      flushFacets({ ...mixed, countryCodes: ['TR'] }, 'Other');
      await harness.fixture.whenStable();
      expect(await options('denomination')).toEqual(['Tümü', 'kuruş']);
      expect(await options('country')).toEqual(['Tümü', 'Türkiye']);
    });

    it('puts a chosen currency in the URL and the request', async () => {
      await openMixed();
      await chooseFilter('denomination', 'kur');

      expect(decodeURIComponent(url())).toBe('/collections/5?currency=kuruş');
      expect(latestCoinRequest().request.params.get('currency')).toBe('kuruş');
    });

    it('keeps the kind buttons while another kind loads, the countries locked until then', async () => {
      await openMixed();
      const other = [
        ...page().querySelectorAll<HTMLButtonElement>('[aria-label="Coin türü"] button'),
      ][2];

      other.click();
      await harness.fixture.whenStable();

      // The counts are the whole list's: they stay
      expect(kindButtons()).toEqual([
        ['Tümü 3', 'false'],
        ['Euro 2', 'false'],
        ['Dünya 1', 'true'],
      ]);
      expect(filterBox('country').disabled).toBe(true);
      // The currencies are the whole list's too
      expect(filterBox('denomination').disabled).toBe(false);

      flushFacets({ ...mixed, countryCodes: ['TR'] }, 'Other');
      await harness.fixture.whenStable();
      expect(filterBox('country').disabled).toBe(false);
      expect(await options('country')).toEqual(['Tümü', 'Türkiye']);
    });

    it('asks for the facets again for another kind only, not for another page', async () => {
      await openMixed();

      await harness.navigateByUrl('/collections/5?page=2&search=tor');

      expect(http.match((r) => r.url === '/api/coins/facets')).toHaveLength(0);
      expect(kindButtons()).toHaveLength(3);
      expect(filterBox('country').disabled).toBe(false);
    });

    it('asks a public collection for its facets', async () => {
      await harness.navigateByUrl('/u/elif.kaya/7');
      const request = http.expectOne((r) => r.url === '/api/public/collections/7/facets');
      expect(request.request.params.get('kind')).toBeNull();
      request.flush(mixed);
      http
        .match(() => true)
        .forEach((r) => r.flush(null, { status: 404, statusText: 'Not Found' }));
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

  it('keeps "clear filters" in place, unavailable, when there is nothing to clear', async () => {
    const clearButtons = () =>
      [...page().querySelectorAll('button')].filter((b) =>
        b.textContent!.includes('Filtreleri temizle'),
      );

    await open('/collections/5', 1, pageWithCoin());

    // The row's button (sm and up) and the folded filters' one (phones)
    expect(clearButtons()).toHaveLength(2);
    expect(clearButtons().every((b) => b.getAttribute('aria-disabled') === 'true')).toBe(true);
    clearButtons()[0].click();
    await harness.fixture.whenStable();
    expect(url()).toBe('/collections/5');
    http.expectNone((r) => r.url === '/api/coins');

    await harness.navigateByUrl('/collections/5?year=2002');
    http.expectOne((r) => r.url === '/api/coins').flush(pageWithCoin());
    await harness.fixture.whenStable();
    expect(clearButtons()).toHaveLength(2);
    expect(clearButtons().every((b) => !b.hasAttribute('aria-disabled'))).toBe(true);
  });

  it('keeps the sort selects and the table headers on the same order', async () => {
    // The box's first line (a fitted box also holds every name, hidden, for its width). The
    // phone's box shows the short column name and the header's arrow, the full name for screen
    // readers (user choice 2026-10-10): 'Yıl / Yıl (yeni → eski)'
    const line = (id: string) => filterBox(id).querySelector('span')!;
    const shown = () => {
      const phone = line('sort-phone');
      const full = phone.querySelector('.sr-only');
      const short = phone.querySelector('[aria-hidden=true]')?.textContent!.trim();
      return [
        line('sort').textContent!.trim(),
        full ? short + ' / ' + full.textContent : phone.textContent!.trim(),
      ];
    };
    const phoneArrow = () => line('sort-phone').querySelector('path')!.getAttribute('d');
    const sortedHeader = () => page().querySelector('th[aria-sort]');

    await open('/collections/5', 1, pageWithCoin());
    // The first row's (sm and up) and the phones': lists without typing, "Sırala" with the
    // default order and no "clear sort" in the list then
    expect(filterBox('sort').tagName).toBe('BUTTON');
    expect(filterBox('sort').getAttribute('aria-label')).toBe('Sırala');
    expect(shown()).toEqual(['Sırala', 'Sırala']);
    expect((await options('sort'))[0]).toBe('Başlık (A → Z)');
    expect(sortedHeader()).toBeNull();

    // A header sorts: the selects show it, "clear sort" joins the list
    await harness.navigateByUrl('/collections/5?sort=Year&dir=Desc');
    http.expectOne((r) => r.url === '/api/coins').flush(pageWithCoin());
    await harness.fixture.whenStable();
    expect(shown()).toEqual(['Yıl (yeni → eski)', 'Yıl / Yıl (yeni → eski)']);
    // The header's down arrow
    expect(phoneArrow()).toBe('M8 3.5v9M4.75 9.25 8 12.5l3.25-3.25');
    expect(sortedHeader()!.textContent).toContain('Yıl');
    expect(sortedHeader()!.getAttribute('aria-sort')).toBe('descending');
    expect((await options('sort'))[0]).toBe('Sıralamayı kaldır');

    // The select sorts: the header shows it
    await pickFilter('sort', 'Ülke (A → Z)');
    expect(url()).toBe('/collections/5?sort=Country');
    http.expectOne((r) => r.url === '/api/coins').flush(pageWithCoin());
    await harness.fixture.whenStable();
    expect(shown()).toEqual(['Ülke (A → Z)', 'Ülke / Ülke (A → Z)']);
    expect(phoneArrow()).toBe('M8 12.5v-9M4.75 6.75 8 3.5l3.25 3.25');
    expect(sortedHeader()!.textContent).toContain('Ülke');
    expect(sortedHeader()!.getAttribute('aria-sort')).toBe('ascending');

    // "Clear sort" goes back to the default order
    await pickFilter('sort', 'Sıralamayı kaldır');
    expect(url()).toBe('/collections/5');
    http.expectOne((r) => r.url === '/api/coins').flush(pageWithCoin());
    await harness.fixture.whenStable();
    expect(shown()).toEqual(['Sırala', 'Sırala']);
  });

  it("shows the phone's filters toggle as the funnel, named and counting the folded filters", async () => {
    await open('/collections/5?year=2002&isCommemorative=true&search=euro', 1, pageWithCoin());
    const toggle = page().querySelector<HTMLButtonElement>('button[aria-controls=coin-filters]')!;

    // Named for screen readers and on hover; the search box is not folded, so it is not counted
    expect(toggle.querySelector('.sr-only')!.textContent).toBe('Filtrele');
    expect(toggle.title).toBe('Filtrele');
    // The count on the button's corner (it keeps its size)
    expect(toggle.querySelector('.absolute')!.textContent!.trim()).toBe('2');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
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

  it("locks the nominal and country filters while another collector's facets load", async () => {
    const counts = () =>
      [...page().querySelectorAll('[aria-label="Coin türü"] button')].map((b) =>
        b.textContent!.replace(/\s+/g, ' ').trim(),
      );
    await harness.navigateByUrl('/explore');
    http.match('/api/countries').forEach((r) => r.flush([{ code: 'DE' }, { code: 'TR' }]));
    await harness.fixture.whenStable();
    http.expectOne('/api/public/collectors').flush([
      { userName: 'elif.kaya', coinCount: 2 },
      { userName: 'marco.bianchi', coinCount: 4 },
    ]);
    http
      .expectOne((r) => r.url === '/api/public/coins')
      .flush({ ...pageWithCoin(), totalCount: 6 });
    http
      .expectOne((r) => r.url === '/api/public/coins/facets')
      .flush({ euroCount: 4, otherCount: 2, currencies: ['kuruş'], countryCodes: ['DE', 'TR'] });
    await harness.fixture.whenStable();
    expect(counts()).toEqual(['Tümü 6', 'Euro 4', 'Dünya 2']);

    await chooseFilter('owner', 'elif');

    expect(url()).toBe('/explore?owner=elif.kaya');
    // The buttons stay; their counts are the next collector's, not known yet
    expect(counts()).toEqual(['Tümü', 'Euro', 'Dünya']);
    expect(filterBox('denomination').disabled).toBe(true);
    expect(filterBox('country').disabled).toBe(true);

    const facets = http.expectOne((r) => r.url === '/api/public/coins/facets');
    expect(facets.request.params.get('owner')).toBe('elif.kaya');
    facets.flush({ euroCount: 1, otherCount: 1, currencies: ['kuruş'], countryCodes: ['TR'] });
    await harness.fixture.whenStable();
    expect(counts()).toEqual(['Tümü 2', 'Euro 1', 'Dünya 1']);
    expect(filterBox('denomination').disabled).toBe(false);
    expect(filterBox('country').disabled).toBe(false);
  });

  describe('while loading', () => {
    const titles = () =>
      [...page().querySelectorAll('table tbody tr')].map((r) =>
        r.querySelectorAll('td')[1].textContent!.trim(),
      );
    const busy = () => page().querySelector('[aria-busy]')!.getAttribute('aria-busy');
    const pageButtons = () => [...page().querySelectorAll('app-pagination nav button')];
    const firstOfThree = { ...pageWithCoin(), totalCount: 30, totalPages: 3 };
    const secondOfThree = {
      ...firstOfThree,
      page: 2,
      items: [{ ...coin, id: 2, title: 'Akropolis' }],
    };

    it('says the first list is loading, then shows it', async () => {
      await harness.navigateByUrl('/collections/5');
      http.match('/api/countries').forEach((r) => r.flush([]));
      http.expectOne('/api/collections/5').flush(collection(1));
      await harness.fixture.whenStable();

      expect(page().querySelector('[role=status]')!.textContent).toContain('Yükleniyor…');

      latestCoinRequest().flush(pageWithCoin());
      await harness.fixture.whenStable();
      expect(page().textContent).not.toContain('Yükleniyor…');
      expect(titles()).toEqual(['Brandenburger Tor']);
    });

    it('keeps the list busy and the pages locked until the next page arrives', async () => {
      await open('/collections/5', 30, firstOfThree);
      expect(busy()).toBe('false');

      await harness.navigateByUrl('/collections/5?page=2');

      expect(busy()).toBe('true');
      expect(pageButtons().every((b) => b.getAttribute('aria-disabled') === 'true')).toBe(true);
      expect(page().textContent).toContain('1 / 3');

      latestCoinRequest().flush(secondOfThree);
      await harness.fixture.whenStable();
      expect(busy()).toBe('false');
      expect(titles()).toEqual(['Akropolis']);
      expect(page().textContent).toContain('2 / 3');
      expect(pageButtons().some((b) => b.getAttribute('aria-disabled') === null)).toBe(true);
    });

    it('shows placeholder rows in place of a list that takes a while', async () => {
      await open('/collections/5', 30, firstOfThree);
      // rxjs timers run on setInterval
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      try {
        await harness.navigateByUrl('/collections/5?page=2');
        vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
        await harness.fixture.whenStable();
        expect(titles()).toEqual(['Brandenburger Tor']);

        vi.advanceTimersByTime(1);
        await harness.fixture.whenStable();
        // As many as the list had: the table row and the phone card, hidden from screen readers
        const rows = [...page().querySelectorAll('table tbody tr')];
        expect(rows.map((r) => r.getAttribute('aria-hidden'))).toEqual(['true']);
        expect(page().querySelectorAll('li[aria-hidden=true]')).toHaveLength(1);
        expect(page().textContent).not.toContain('Brandenburger Tor');
        expect(busy()).toBe('true');

        latestCoinRequest().flush(secondOfThree);
        await harness.fixture.whenStable();
        expect(titles()).toEqual(['Akropolis']);
        expect(page().querySelectorAll('[aria-hidden=true] .skeleton')).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('shows placeholders for the name and its place in the way here while the header loads', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      try {
        await harness.navigateByUrl('/collections/5');
        http.match('/api/countries').forEach((r) => r.flush([]));
        vi.advanceTimersByTime(SKELETON_DELAY_MS);
        await harness.fixture.whenStable();

        const heading = page().querySelector('h1')!;
        expect(heading.querySelector('.skeleton')).not.toBeNull();
        expect(heading.textContent).toContain('Yükleniyor…');
        expect(page().querySelectorAll('app-breadcrumbs .skeleton')).toHaveLength(1);

        http.expectOne('/api/collections/5').flush(collection(1));
        latestCoinRequest().flush(pageWithCoin());
        await harness.fixture.whenStable();
        expect(heading.textContent!.trim()).toBe('Koleksiyonum');
        expect(page().querySelectorAll('.skeleton')).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('shows placeholder rows for the first list too, up to its coins', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      try {
        await harness.navigateByUrl('/collections/5');
        http.match('/api/countries').forEach((r) => r.flush([]));
        http.expectOne('/api/collections/5').flush(collection(3));
        vi.advanceTimersByTime(SKELETON_DELAY_MS);
        await harness.fixture.whenStable();

        expect(page().querySelectorAll('table tbody tr[aria-hidden=true]')).toHaveLength(3);
        expect(page().querySelector('[role=status]')!.textContent).toContain('Yükleniyor…');
        latestCoinRequest().flush(pageWithCoin());
      } finally {
        vi.useRealTimers();
      }
    });

    it('says when the next list cannot be loaded', async () => {
      await open('/collections/5', 30, firstOfThree);

      await harness.navigateByUrl('/collections/5?page=2');
      latestCoinRequest().flush(null, { status: 500, statusText: 'Server Error' });
      await harness.fixture.whenStable();

      expect(page().querySelector('[role=alert]')!.textContent).toContain("Coin'ler yüklenemedi");
      expect(page().querySelector('table')).toBeNull();
    });
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
    // The first page's facets were cancelled by the navigation
    http
      .match(() => true)
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush(null, { status: 404, statusText: 'Not Found' }));
  });
});
