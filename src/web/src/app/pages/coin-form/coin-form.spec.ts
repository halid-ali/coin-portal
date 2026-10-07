import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { Coin, CoinSide } from '../../core/coins/coin.models';
import { CollectionReturn } from '../../core/coins/collection-return';
import { Collection } from '../../core/collections/collection.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { ImageChange } from '../../shared/image-change';
import { CoinForm } from './coin-form';

@Component({ template: '' })
class CollectionPage {}

const vitrin: Collection = {
  id: 5,
  name: 'Vitrin',
  description: null,
  visibility: 'Public',
  coinCount: 10,
  photographedCoinCount: 10,
  minPublicCoins: 10,
  canBePublic: true,
  coverImageId: null,
  moderationLocked: false,
  shareToken: null,
  createdAtUtc: '2026-10-01T12:00:00Z',
  updatedAtUtc: '2026-10-01T12:00:00Z',
};

const coin: Coin = {
  id: 1,
  collectionId: 5,
  title: '2 € · Almanya · 2006',
  description: null,
  denomination: 'Euro2',
  countryCode: 'DE',
  year: 2006,
  mintMark: null,
  isCommemorative: false,
  quantity: 1,
  photos: [{ side: 'National', id: 'p1' }],
};

const wouldUnpublish = {
  body: { code: 'would_unpublish', collections: [{ id: 5, name: 'Vitrin' }] },
  options: { status: 409, statusText: 'Conflict' },
};

/** What the tests reach that the page keeps to itself: the photo slots are driven by a cropper. */
interface CoinFormInternals {
  photoChanges: Record<CoinSide, WritableSignal<ImageChange | null>>;
  hasUnsavedChanges(): boolean;
}

describe('CoinForm', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let confirm: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    confirm = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'coins/new', component: CoinForm },
            { path: 'coins/:id/edit', component: CoinForm },
            { path: 'collections/:collectionId', component: CollectionPage },
          ],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
        { provide: ConfirmDialogService, useValue: { confirm } },
      ],
    });
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement!;
  const url = () => TestBed.inject(Router).url;
  const form = () => harness.routeDebugElement!.componentInstance as CoinForm;
  const internals = () => form() as unknown as CoinFormInternals;
  const submit = () => page().querySelector('form')!.dispatchEvent(new Event('submit'));

  async function open(path: string, edited?: Coin): Promise<void> {
    await harness.navigateByUrl(path);
    http.match('/api/countries').forEach((r) => r.flush([{ code: 'DE' }]));
    http.expectOne('/api/collections').flush([vitrin]);
    if (edited) {
      http.expectOne(`/api/coins/${edited.id}`).flush(edited);
    }
    await harness.fixture.whenStable();
  }

  function fillNewCoin(): void {
    form()['form'].patchValue({
      collectionId: 5,
      denomination: 'Euro2',
      countryCode: 'DE',
      year: 2006,
      title: '2 € · Almanya · 2006',
    });
  }

  function breadcrumbs() {
    const nav = page().querySelector('nav[aria-label="Sayfa yolu"]')!;
    return {
      links: [...nav.querySelectorAll('a')].map((a) => [
        a.textContent!.trim(),
        a.getAttribute('href'),
      ]),
      current: nav.querySelector('[aria-current=page]')!.textContent!.trim(),
    };
  }

  it("names the coin's collection in the breadcrumbs", async () => {
    await open('/coins/new?collection=5');

    expect(breadcrumbs()).toEqual({
      links: [
        ['Koleksiyonlarım', '/collections'],
        ['Vitrin', '/collections/5'],
      ],
      current: 'Coin ekle',
    });
  });

  it('leads back to the list the user came from, only if it is the same collection', async () => {
    const collectionReturn = TestBed.inject(CollectionReturn);
    collectionReturn.remember('/collections/5?view=grid&page=2');
    await open('/coins/1/edit', coin);
    expect(breadcrumbs().links[1]).toEqual(['Vitrin', '/collections/5?view=grid&page=2']);
    expect(breadcrumbs().current).toBe("Coin'i düzenle");

    collectionReturn.remember('/collections/9?page=3');
    await harness.fixture.whenStable();
    expect(breadcrumbs().links[1]).toEqual(['Vitrin', '/collections/5']);
  });

  it('saves a new coin together with its chosen photos', async () => {
    await open('/coins/new?collection=5');
    fillNewCoin();
    internals().photoChanges.National.set({ type: 'upload', image: new Blob(['jpeg']) });

    submit();

    // One request: the coin never exists without its photo, so it may join a public collection
    const request = http.expectOne('/api/coins/with-photos');
    const body = request.request.body as FormData;
    expect(JSON.parse(body.get('coin') as string)).toMatchObject({ collectionId: 5, year: 2006 });
    expect(body.get('national')).toBeInstanceOf(Blob);
    expect(body.has('common')).toBe(false);
    request.flush({ ...coin, id: 7 });

    await vi.waitFor(() => expect(url()).toBe('/collections/5'));
    http.expectNone((r) => r.url.startsWith('/api/coins/7/photos'));
  });

  it('names the side of a refused photo and creates nothing', async () => {
    await open('/coins/new?collection=5');
    fillNewCoin();
    internals().photoChanges.National.set({ type: 'upload', image: new Blob(['jpeg']) });

    submit();
    http
      .expectOne('/api/coins/with-photos')
      .flush(
        { code: 'invalid_image', side: 'National' },
        { status: 400, statusText: 'Bad Request' },
      );
    await harness.fixture.whenStable();

    expect(page().querySelector('[role=alert]')!.textContent).toContain(
      'Ulusal yüz: Fotoğraf işlenemedi.',
    );
    expect(url()).toBe('/coins/new?collection=5');
    // Still pending: a retry sends the photo again
    expect(internals().photoChanges.National()).not.toBeNull();
  });

  it('changes nothing when the user keeps the collection public', async () => {
    await open('/coins/1/edit', coin);

    submit();
    http.expectOne('/api/coins/1').flush(wouldUnpublish.body, wouldUnpublish.options);
    confirm.mockResolvedValueOnce(false);
    await vi.waitFor(() => expect(confirm).toHaveBeenCalled());
    await harness.fixture.whenStable();

    http.expectNone('/api/coins/1?unpublish=true');
    expect(url()).toBe('/coins/1/edit');
    expect(page().querySelector('[role=alert]')).toBeNull();
  });

  it('keeps the national side photo, without an error, when the user keeps the collection public', async () => {
    await open('/coins/1/edit', coin);
    internals().photoChanges.National.set({ type: 'remove' });
    confirm.mockResolvedValueOnce(false);

    submit();
    http.expectOne('/api/coins/1').flush(coin);
    (await vi.waitFor(() => http.expectOne('/api/coins/1/photos/national'))).flush(
      wouldUnpublish.body,
      wouldUnpublish.options,
    );
    await vi.waitFor(() =>
      expect(page().querySelector('[role=status]')?.textContent).toContain(
        'Ulusal yüz fotoğrafı silinmedi; koleksiyon herkese açık kaldı.',
      ),
    );

    expect(page().querySelector('[role=alert]')).toBeNull();
    expect(url()).toBe('/coins/1/edit');
    // The removal is taken back: nothing pending, leaving does not ask
    expect(internals().photoChanges.National()).toBeNull();
    expect(internals().hasUnsavedChanges()).toBe(false);
  });

  it('deletes the national side photo once the user lets the collection go', async () => {
    await open('/coins/1/edit', coin);
    internals().photoChanges.National.set({ type: 'remove' });
    confirm.mockResolvedValueOnce(true);

    submit();
    http.expectOne('/api/coins/1').flush(coin);
    (await vi.waitFor(() => http.expectOne('/api/coins/1/photos/national'))).flush(
      wouldUnpublish.body,
      wouldUnpublish.options,
    );
    (await vi.waitFor(() => http.expectOne('/api/coins/1/photos/national?unpublish=true'))).flush(
      null,
      { status: 204, statusText: 'No Content' },
    );

    await vi.waitFor(() => expect(url()).toBe('/collections/5'));
  });
});
