import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { UserResponse } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { Coin, CoinSummary, PagedResponse } from '../../core/coins/coin.models';
import { Collection } from '../../core/collections/collection.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { HomeDashboard, QUICK_CHECK_SIZE, RECENT_SIZE } from './home-dashboard';

const user = { userName: 'ayse.yilmaz', firstName: 'Ayşe' } as UserResponse;

const collection = (
  id: number,
  name: string,
  visibility: Collection['visibility'],
): Collection => ({
  id,
  name,
  description: null,
  visibility,
  coinCount: 1,
  photographedCoinCount: 1,
  minPublicCoins: 10,
  canBePublic: false,
  coverImageId: null,
  moderationLocked: false,
  shareToken: null,
  createdAtUtc: '2026-10-01T12:00:00Z',
  updatedAtUtc: '2026-10-01T12:00:00Z',
});

const coin = (id: number, title: string, collectionId = 1, quantity = 1): Coin => ({
  id,
  collectionId,
  title,
  description: null,
  denomination: 'Euro2',
  countryCode: 'DE',
  year: 2006,
  mintMark: null,
  isCommemorative: false,
  quantity,
  photos: [],
});

const page = (items: Coin[], totalCount = items.length): PagedResponse<Coin> => ({
  items,
  page: 1,
  pageSize: 5,
  totalCount,
  totalPages: 1,
});

describe('HomeDashboard', () => {
  let fixture: ComponentFixture<HomeDashboard>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HomeDashboard],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
        { provide: AuthService, useValue: { currentUser: signal(user) } },
      ],
    });
    // The page defers the new collection dialog
    await TestBed.compileComponents();
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  /** Opens the page and answers its three requests. */
  async function open(
    collections: Collection[],
    summary: CoinSummary,
    recent: Coin[] = [],
  ): Promise<void> {
    fixture = TestBed.createComponent(HomeDashboard);
    http.expectOne('/api/collections').flush(collections);
    http.expectOne('/api/coins/summary').flush(summary);
    const recentRequest = http.expectOne((r) => r.url === '/api/coins' && !r.params.has('search'));
    expect(recentRequest.request.params.get('sort')).toBe('Newest');
    expect(recentRequest.request.params.get('pageSize')).toBe(String(RECENT_SIZE));
    recentRequest.flush(page(recent));
    await fixture.whenStable();
  }

  function type(value: string): void {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#quick-check',
    )!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('greets the user and shows the counts, recent coins and collections', async () => {
    await open(
      [collection(1, 'Koleksiyonum', 'Private'), collection(2, 'Hatıra paraları', 'Unlisted')],
      { coinCount: 42, countryCount: 14, commemorativeCount: 11 },
      [coin(7, '2 € · Malta · 2019', 2)],
    );

    expect(text()).toContain('Hoş geldin, Ayşe!');
    expect(text()).toContain('Koleksiyonunda 42 coin var.');
    expect(text()).toMatch(/42\s*coin/);
    expect(text()).toMatch(/2\s*koleksiyon/);
    expect(text()).toMatch(/14\s*ülke/);
    expect(text()).toMatch(/11\s*hatıra parası/);
    expect(text()).toContain('2 € · Malta · 2019');
    expect(text()).toContain('Hatıra paraları');
    // No public collection: no profile link
    expect(text()).not.toContain('Vitrinin herkese açık');
  });

  it('grays out a new collection before the address is verified, and adding coins at the limit', async () => {
    const currentUser = TestBed.inject(AuthService).currentUser as WritableSignal<UserResponse>;
    currentUser.set({ ...user, emailConfirmed: false, unverifiedMaxCoins: 20 });
    const counts = { countryCount: 3, commemorativeCount: 0 };
    const element = () => fixture.nativeElement as HTMLElement;
    const control = (label: string) =>
      [...element().querySelectorAll('a, button')].find((e) => e.textContent!.includes(label))!;

    await open([collection(1, 'Koleksiyonum', 'Private')], { coinCount: 19, ...counts });
    expect(control('Coin ekle').tagName).toBe('A');
    // There, but gray; the reason is the e-mail notice's line
    const newCollection = control('Yeni koleksiyon');
    expect(newCollection.getAttribute('aria-disabled')).toBe('true');
    expect(newCollection.getAttribute('aria-describedby')).toBe('email-limit-collections');
    (newCollection as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(element().querySelector('app-collection-form-dialog')).toBeNull();

    await open([collection(1, 'Koleksiyonum', 'Private')], { coinCount: 20, ...counts });
    const addCoin = control('Coin ekle');
    expect(addCoin.tagName).toBe('BUTTON');
    expect(addCoin.getAttribute('aria-disabled')).toBe('true');
    expect(addCoin.getAttribute('aria-describedby')).toBe('email-limit-coins');
  });

  it('invites to add the first coin and hides recent coins when there are none', async () => {
    await open([collection(1, 'Koleksiyonum', 'Private')], {
      coinCount: 0,
      countryCount: 0,
      commemorativeCount: 0,
    });

    expect(text()).toContain("Henüz coin'in yok.");
    expect(text()).not.toContain('Son eklediklerin');
  });

  it('searches all collections after typing and lists the matches', async () => {
    await open([collection(1, 'Koleksiyonum', 'Private')], {
      coinCount: 9,
      countryCount: 1,
      commemorativeCount: 0,
    });

    type('  almanya 2006 ');
    const request = await vi.waitFor(() =>
      http.expectOne((r) => r.url === '/api/coins' && r.params.has('search')),
    );
    expect(request.request.params.get('search')).toBe('almanya 2006');
    expect(request.request.params.get('pageSize')).toBe(String(QUICK_CHECK_SIZE));
    expect(request.request.params.has('collectionId')).toBe(false);
    request.flush(
      page(
        [coin(1, '2 € · Almanya · 2006', 1, 2), ...[2, 3, 4, 5].map((id) => coin(id, `C${id}`))],
        7,
      ),
    );
    await fixture.whenStable();

    expect(text()).toContain('2 € · Almanya · 2006');
    expect(text()).toContain('Koleksiyonum · 2 adet');
    expect(text()).toContain('ve 2 sonuç daha');
  });

  it('says so when the coin is not in the collection, and clears with the box', async () => {
    await open([collection(1, 'Koleksiyonum', 'Private')], {
      coinCount: 9,
      countryCount: 1,
      commemorativeCount: 0,
    });

    type('malta 1999');
    (
      await vi.waitFor(() =>
        http.expectOne((r) => r.url === '/api/coins' && r.params.has('search')),
      )
    ).flush(page([]));
    await fixture.whenStable();
    expect(text()).toContain('Koleksiyonunda yok.');

    type('');
    await vi.waitFor(() => expect(text()).not.toContain('Koleksiyonunda yok.'));
    http.expectNone((r) => r.params.has('search'));
  });

  it('shows the profile link while a collection is public', async () => {
    await open([collection(1, 'Koleksiyonum', 'Public')], {
      coinCount: 1,
      countryCount: 1,
      commemorativeCount: 0,
    });

    expect(text()).toContain('Vitrinin herkese açık');
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a[href="/u/ayse.yilmaz"]',
    );
    expect(link?.textContent).toContain('/u/ayse.yilmaz');
  });
});
