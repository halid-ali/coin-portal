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
import { SKELETON_DELAY_MS } from '../../shared/skeleton';

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
  kind: 'Euro',
  denomination: 'Euro2',
  faceValue: null,
  currency: null,
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
  // The collection, denomination and country fields are lists to type in (comboboxes)
  const listBox = (id: string) => page().querySelector<HTMLInputElement>(`#${id}`)!;
  async function listKey(id: string, key: string): Promise<void> {
    listBox(id).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await harness.fixture.whenStable();
  }
  /** A list's option names as it opens (closed again afterwards). */
  async function listNames(id: string): Promise<string[]> {
    listBox(id).click();
    await harness.fixture.whenStable();
    const names = [...page().querySelectorAll('[role=option]')].map((o) => o.textContent!.trim());
    await listKey(id, 'Escape');
    return names;
  }
  /** Types into a list's box and picks the first match. */
  async function choose(id: string, typed: string): Promise<void> {
    listBox(id).focus();
    listBox(id).value = typed;
    listBox(id).dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    await listKey(id, 'Enter');
  }
  const countryBox = () => listBox('countryCode');
  const countryNames = () => listNames('countryCode');
  const chooseCountry = (name: string) => choose('countryCode', name);

  async function open(
    path: string,
    edited?: Coin,
    countries: string[] = ['DE'],
    collections: Collection[] = [vitrin],
  ): Promise<void> {
    await harness.navigateByUrl(path);
    // Like the API: every country marked (these are all euro issuers)
    http
      .match('/api/countries')
      .forEach((r) => r.flush(countries.map((code) => ({ code, euroIssuer: true }))));
    http.expectOne('/api/collections').flush(collections);
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

  // Written down before coins other than euro coins (roadmap 18): the euro form stays like this
  describe('a euro coin', () => {
    const control = (id: string) => page().querySelector<HTMLInputElement>(`#${id}`)!;
    const setYear = async (year: number) => {
      const input = control('year');
      input.value = String(year);
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await harness.fixture.whenStable();
    };

    it('offers the eight denominations from the largest and the countries by name', async () => {
      await open('/coins/new?collection=5', undefined, ['DE', 'AT', 'BE']);

      // Lists to type in since 2026-10-09 (were selects with these options and "Seç…" first); the
      // denomination is a list without typing since 2026-10-10 (a button showing "Seç…")
      expect(listBox('denomination').tagName).toBe('BUTTON');
      expect(listBox('denomination').textContent!.trim()).toBe('Seç…');
      expect(await listNames('denomination')).toEqual([
        '2 €',
        '1 €',
        '50 cent',
        '20 cent',
        '10 cent',
        '5 cent',
        '2 cent',
        '1 cent',
      ]);
      expect(countryBox().placeholder).toBe('Seç…');
      expect(await countryNames()).toEqual(['Almanya', 'Avusturya', 'Belçika']);
    });

    it('takes the denomination picked from the list', async () => {
      await open('/coins/new?collection=5');
      // Nothing to type: the first letters jump to an option, Enter takes it
      await listKey('denomination', '5');
      await listKey('denomination', '0');
      await listKey('denomination', 'Enter');

      expect(form()['form'].controls.denomination.value).toBe('Cent50');
      expect(control('denomination').textContent!.trim()).toBe('50 cent');
    });

    it('moves a coin to the collection picked from the list, as its numeric id', async () => {
      const other: Collection = { ...vitrin, id: 7, name: 'Hatıra kutusu' };
      await open('/coins/1/edit', coin, ['DE'], [vitrin, other]);
      expect(control('collectionId').value).toBe('Vitrin');
      expect(await listNames('collectionId')).toEqual(['Vitrin', 'Hatıra kutusu']);

      await choose('collectionId', 'hat');

      expect(form()['form'].controls.collectionId.value).toBe(7);
      expect(page().querySelector('#collectionId-hint')!.textContent).toContain('taşınır');
      expect(control('collectionId').getAttribute('aria-describedby')).toBe(
        'collectionId-error collectionId-hint',
      );
    });

    it('keeps the collection list closed while the collection is locked', async () => {
      await open('/coins/1/edit', coin, ['DE'], [{ ...vitrin, moderationLocked: true }]);

      expect(control('collectionId').disabled).toBe(true);
      expect(page().querySelector('#collectionId-hint')!.textContent).toContain('taşınamaz');
    });

    it('takes a year from 1999 up to next year', async () => {
      await open('/coins/new?collection=5');
      const nextYear = new Date().getUTCFullYear() + 1;

      await setYear(1998);
      expect(page().querySelector('#year-error')!.textContent).toContain('En az 1999 olmalı.');
      await setYear(nextYear + 1);
      expect(page().querySelector('#year-error')!.textContent).toContain(
        `En fazla ${nextYear} olabilir.`,
      );
      await setYear(1999);
      expect(page().querySelector('#year-error')).toBeNull();
      expect(page().querySelector('#year-hint')!.textContent).toContain(`1999–${nextYear}`);
    });

    it('suggests the title of a new coin until the user writes one', async () => {
      await open('/coins/new?collection=5');
      const controls = form()['form'].controls;

      controls.denomination.setValue('Euro2');
      controls.countryCode.setValue('DE');
      controls.year.setValue(2006);
      expect(controls.title.value).toBe('2 € · Almanya · 2006');

      const title = control('title');
      title.value = 'Benim coin';
      title.dispatchEvent(new Event('input'));
      controls.year.setValue(2011);
      expect(controls.title.value).toBe('Benim coin');
    });

    it('keeps the title of an edited coin', async () => {
      await open('/coins/1/edit', coin);
      const controls = form()['form'].controls;

      controls.year.setValue(2011);

      expect(controls.title.value).toBe('2 € · Almanya · 2006');
    });

    it('sends every field of a new coin, trimmed', async () => {
      await open('/coins/new?collection=5');
      form()['form'].setValue({
        collectionId: 5,
        denomination: 'Cent10',
        countryCode: 'DE',
        year: 2002,
        title: '  Brandenburger Tor  ',
        mintMark: ' A ',
        isCommemorative: true,
        quantity: 3,
        description: '   ',
      });

      submit();

      expect(http.expectOne({ method: 'POST', url: '/api/coins' }).request.body).toEqual({
        collectionId: 5,
        title: 'Brandenburger Tor',
        description: null,
        denomination: 'Cent10',
        countryCode: 'DE',
        year: 2002,
        mintMark: 'A',
        isCommemorative: true,
        quantity: 3,
      });
    });

    it('loads an edited coin into the form and sends it back as it was', async () => {
      const edited: Coin = {
        ...coin,
        description: 'Bremen',
        mintMark: 'A',
        isCommemorative: true,
        quantity: 2,
      };
      await open('/coins/1/edit', edited);

      expect(form()['form'].controls.denomination.value).toBe('Euro2');
      expect(control('denomination').textContent!.trim()).toBe('2 €');
      expect(form()['form'].controls.countryCode.value).toBe('DE');
      expect(control('countryCode').value).toBe('Almanya');
      expect(control('year').value).toBe('2006');
      submit();

      const request = http.expectOne({ method: 'PUT', url: '/api/coins/1' });
      expect(request.request.body).toEqual({
        collectionId: 5,
        title: '2 € · Almanya · 2006',
        description: 'Bremen',
        denomination: 'Euro2',
        countryCode: 'DE',
        year: 2006,
        mintMark: 'A',
        isCommemorative: true,
        quantity: 2,
      });
      request.flush(edited);
      await vi.waitFor(() => expect(url()).toBe('/collections/5'));
    });

    it('names the photo sides national and common', async () => {
      await open('/coins/new?collection=5');

      const slots = [...page().querySelectorAll('app-photo-slot')].map((s) => s.textContent!);
      expect(slots).toHaveLength(2);
      expect(slots[0]).toContain('Ulusal yüz');
      expect(slots[1]).toContain('Ortak yüz');
    });
  });

  describe('an other coin', () => {
    const control = (id: string) => page().querySelector<HTMLInputElement>(`#${id}`)!;
    const type = async (id: string, value: string) => {
      const input = control(id);
      input.value = value;
      input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input'));
      input.dispatchEvent(new Event('blur'));
      await harness.fixture.whenStable();
    };
    // Angular's radio [value] is not written to the DOM: the radio is found by its label
    const chooseKind = async (label: string) => {
      const radio = [...page().querySelectorAll('label')]
        .find((l) => l.textContent!.includes(label))!
        .querySelector('input')!;
      radio.click();
      await harness.fixture.whenStable();
    };
    const currencies = (list: string[]) =>
      http
        .expectOne('/api/coins/facets')
        .flush({ euroCount: 0, otherCount: list.length, currencies: list, countryCodes: [] });

    /** A new coin, with a euro issuer and a country outside the euro. */
    async function openNew(): Promise<void> {
      await harness.navigateByUrl('/coins/new?collection=5');
      http.expectOne('/api/countries').flush([
        { code: 'DE', name: 'Germany', euroIssuer: true },
        { code: 'TR', name: 'Türkiye', euroIssuer: false },
      ]);
      http.expectOne('/api/collections').flush([vitrin]);
      await harness.fixture.whenStable();
    }

    it('offers its own fields, every country and the currencies used so far', async () => {
      await openNew();
      expect(await countryNames()).toEqual(['Almanya']);
      // No suggestions asked for a euro coin
      http.expectNone('/api/coins/facets');

      await chooseKind("Dünya coin'i");
      currencies(['kuruş', 'Mark']);
      await harness.fixture.whenStable();

      expect(page().querySelector('#denomination')).toBeNull();
      expect(await countryNames()).toEqual(['Almanya', 'Türkiye']);
      // Suggested in the currency box (a list to type in since 2026-10-09, was a datalist)
      control('currency').click();
      await harness.fixture.whenStable();
      expect(
        [...page().querySelectorAll('[role=option]')].map((o) => o.textContent!.trim()),
      ).toEqual(['kuruş', 'Mark']);
      expect(page().querySelector('#year-hint')!.textContent).toContain('1–');
      const slots = [...page().querySelectorAll('app-photo-slot')].map((s) => s.textContent!);
      expect(slots[0]).toContain('Ön yüz');
      expect(slots[1]).toContain('Arka yüz');
      expect(page().textContent).toContain('herkese açık bir koleksiyon için iki yüzün de');
    });

    it('suggests the title from value, currency, country and year, and sends its kind', async () => {
      await openNew();
      await chooseKind("Dünya coin'i");
      currencies([]);

      await type('faceValue', '0,5');
      await type('currency', ' penny ');
      await chooseCountry('Tür');
      await type('year', '1975');
      expect(control('title').value).toBe('0,5 penny · Türkiye · 1975');

      submit();
      expect(http.expectOne({ method: 'POST', url: '/api/coins' }).request.body).toEqual({
        collectionId: 5,
        title: '0,5 penny · Türkiye · 1975',
        description: null,
        kind: 'Other',
        faceValue: 0.5,
        currency: 'penny',
        countryCode: 'TR',
        year: 1975,
        mintMark: null,
        isCommemorative: false,
        quantity: 1,
      });
    });

    it('needs a value above zero and a currency', async () => {
      await openNew();
      await chooseKind("Dünya coin'i");
      currencies([]);

      await type('faceValue', '0');
      submit();
      await harness.fixture.whenStable();

      http.expectNone({ method: 'POST', url: '/api/coins' });
      expect(page().querySelector('#faceValue-error')!.textContent).toContain(
        '25 ya da 0,5 gibi sıfırdan büyük bir sayı yaz',
      );
      expect(page().querySelector('#currency-error')!.textContent).toContain('zorunlu');
    });

    it('drops a country outside the euro when the coin becomes a euro coin', async () => {
      await openNew();
      await chooseKind("Dünya coin'i");
      currencies([]);
      await chooseCountry('Tür');

      await chooseKind('Euro coin');

      expect(form()['form'].controls.countryCode.value).toBe('');
      expect(await countryNames()).toEqual(['Almanya']);
    });

    it('shows the form as placeholders while an edited coin takes a while', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      try {
        await harness.navigateByUrl('/coins/1/edit');
        http.expectOne('/api/countries').flush([{ code: 'DE', name: 'Almanya', euroIssuer: true }]);
        http.expectOne('/api/collections').flush([vitrin]);
        vi.advanceTimersByTime(SKELETON_DELAY_MS);
        await harness.fixture.whenStable();

        expect(page().querySelector('form')).toBeNull();
        const shapes = page().querySelector('.card[aria-hidden=true]')!;
        // The labels are known, the fields are shapes
        expect(shapes.textContent).toContain('Başlık');
        expect(shapes.querySelectorAll('.skeleton').length).toBeGreaterThan(5);
        // The coin's collection in the way here, still a placeholder
        expect(page().querySelectorAll('app-breadcrumbs .skeleton')).toHaveLength(1);

        http.expectOne('/api/coins/1').flush(coin);
        await harness.fixture.whenStable();
        expect(page().querySelector('form')).not.toBeNull();
        // (The photo keeps its own shape until it arrives, which jsdom never does)
        expect(page().querySelector('.card[aria-hidden=true]')).toBeNull();
        expect(page().querySelectorAll('app-breadcrumbs .skeleton')).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('loads an edited coin with its value in the language and sends it back', async () => {
      const edited: Coin = {
        ...coin,
        title: '0,5 penny · Türkiye · 1975',
        kind: 'Other',
        denomination: null,
        faceValue: 0.5,
        currency: 'penny',
        countryCode: 'TR',
        year: 1975,
      };
      await harness.navigateByUrl('/coins/1/edit');
      http.expectOne('/api/countries').flush([{ code: 'TR', name: 'Türkiye', euroIssuer: false }]);
      http.expectOne('/api/collections').flush([vitrin]);
      http.expectOne('/api/coins/1').flush(edited);
      currencies(['penny']);
      await harness.fixture.whenStable();

      expect(control('faceValue').value).toBe('0,5');
      expect(control('currency').value).toBe('penny');
      submit();

      const request = http.expectOne({ method: 'PUT', url: '/api/coins/1' });
      expect(request.request.body).toMatchObject({
        kind: 'Other',
        faceValue: 0.5,
        currency: 'penny',
      });
      expect(request.request.body).not.toHaveProperty('denomination');
      request.flush(edited);
      await vi.waitFor(() => expect(url()).toBe('/collections/5'));
    });
  });

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

  it('links to the photo storage when a photo does not fit', async () => {
    await open('/coins/new?collection=5');
    fillNewCoin();
    internals().photoChanges.National.set({ type: 'upload', image: new Blob(['jpeg']) });

    submit();
    http
      .expectOne('/api/coins/with-photos')
      .flush(
        { code: 'quota_exceeded', side: 'National' },
        { status: 400, statusText: 'Bad Request' },
      );
    await harness.fixture.whenStable();

    const alert = page().querySelector('[role=alert]')!;
    expect(alert.textContent).toContain('Ulusal yüz: Fotoğraf saklama alanın doldu.');
    const link = alert.querySelector('a')!;
    expect(link.textContent!.trim()).toBe('Fotoğraf alanına bak');
    expect(link.getAttribute('href')).toBe('/settings/account');

    // Another error: no link
    submit();
    http
      .expectOne('/api/coins/with-photos')
      .flush(
        { code: 'invalid_image', side: 'National' },
        { status: 400, statusText: 'Bad Request' },
      );
    await harness.fixture.whenStable();
    expect(page().querySelector('[role=alert] a')).toBeNull();
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
        'Fotoğraf silinmedi; koleksiyon herkese açık kaldı.',
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
