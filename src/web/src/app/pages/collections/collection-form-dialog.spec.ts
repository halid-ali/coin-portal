import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { UserResponse } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { Collection } from '../../core/collections/collection.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { pressEscape, stubModalDialogs } from '../../shared/testing/dialogs';
import { CollectionFormDialog } from './collection-form-dialog';

const collection: Collection = {
  id: 5,
  name: 'Koleksiyonum',
  description: null,
  visibility: 'Unlisted',
  coinCount: 3,
  photographedCoinCount: 3,
  minPublicCoins: 10,
  canBePublic: false,
  coverImageId: null,
  moderationLocked: false,
  shareToken: 'old-token',
  createdAtUtc: '2026-10-01T12:00:00Z',
  updatedAtUtc: '2026-10-01T12:00:00Z',
};

const user: UserResponse = {
  id: '1',
  userName: 'alice',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  birthDate: '1990-01-01',
  language: null,
  theme: null,
  accent: null,
  previousSignInAtUtc: null,
  emailConfirmed: true,
  unverifiedMaxCoins: null,
  unverifiedDeletionDueUtc: null,
  roles: [],
};

describe('CollectionFormDialog', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<CollectionFormDialog>;
  let emitted: (Collection | null)[];

  beforeEach(async () => {
    stubModalDialogs();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTestTransloco()],
    });
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);

    // Signed in, so the share link (and its "new link" button) is shown
    const signedIn = firstValueFrom(
      TestBed.inject(AuthService).login({
        userNameOrEmail: 'alice',
        password: 'x',
        rememberMe: true,
      }),
    );
    http.expectOne('/api/auth/login').flush(user);
    http.expectOne('/api/auth/antiforgery').flush(null);
    await signedIn;

    fixture = TestBed.createComponent(CollectionFormDialog);
    fixture.componentRef.setInput('collection', collection);
    emitted = [];
    fixture.componentInstance.closed.subscribe((c) => emitted.push(c));
    await fixture.whenStable();
  });

  afterEach(() => document.querySelectorAll('app-confirm-dialog').forEach((e) => e.remove()));

  const element = () => fixture.nativeElement as HTMLElement;
  const dialog = () => element().querySelector('dialog')!;
  /** The open confirmation (attached to <body>, rendered by the application tick). */
  const confirmDialog = () => {
    TestBed.tick();
    return document.querySelector('app-confirm-dialog');
  };

  function button(root: ParentNode, text: string): HTMLButtonElement {
    return [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent!.includes(text),
    )!;
  }

  async function settle(): Promise<void> {
    await vi.waitFor(async () => {
      await fixture.whenStable();
      await Promise.resolve();
    });
  }

  /** The visibility radio whose option reads `label` (Angular does not write [value] to the DOM). */
  function visibilityRadio(label: string): HTMLInputElement {
    const option = [...element().querySelectorAll('fieldset label')].find((l) =>
      l.textContent!.includes(label),
    )!;
    return option.querySelector('input')!;
  }

  it('offers "public" only once the collection meets the requirements, and says why', async () => {
    // 3 coins with photos, 10 needed
    const publicRadio = visibilityRadio('Herkese açık');
    expect(publicRadio.disabled).toBe(true);
    const reason = element().querySelector(`#${publicRadio.getAttribute('aria-describedby')}`)!;
    expect(reason.textContent).toContain('Henüz seçilemez: 3/10 fotoğraflı coin');
    // The group says it too: screen readers often skip a disabled radio
    expect(element().querySelector('fieldset')!.getAttribute('aria-describedby')).toBe(
      publicRadio.getAttribute('aria-describedby'),
    );
    expect(visibilityRadio('Özel').disabled).toBe(false);

    fixture.componentRef.setInput('collection', {
      ...collection,
      coinCount: 11,
      photographedCoinCount: 10,
    });
    await fixture.whenStable();
    expect(visibilityRadio('Herkese açık').disabled).toBe(true);
    expect(element().textContent).toContain("1 coin'in fotoğrafı eksik");

    fixture.componentRef.setInput('collection', {
      ...collection,
      coinCount: 10,
      photographedCoinCount: 10,
      canBePublic: true,
    });
    await fixture.whenStable();
    expect(visibilityRadio('Herkese açık').disabled).toBe(false);
    expect(element().querySelector('fieldset')!.hasAttribute('aria-describedby')).toBe(false);
  });

  it('without a confirmed e-mail, offers no new way of sharing but keeps the current one', async () => {
    TestBed.inject(AuthService).patchUser({ emailConfirmed: false });
    fixture.componentRef.setInput('collection', {
      ...collection,
      coinCount: 10,
      photographedCoinCount: 10,
      canBePublic: true,
    });
    await fixture.whenStable();

    // Unlisted already (shared before verification): stays choosable; Public would be new
    const publicRadio = visibilityRadio('Herkese açık');
    expect(visibilityRadio('Sadece linkle').disabled).toBe(false);
    expect(publicRadio.disabled).toBe(true);
    const reason = element().querySelector(`#${publicRadio.getAttribute('aria-describedby')}`)!;
    expect(reason.textContent).toContain('e-posta adresini doğrula');
    expect(element().querySelector('fieldset')!.getAttribute('aria-describedby')).toBe(
      publicRadio.getAttribute('aria-describedby'),
    );

    fixture.componentRef.setInput('collection', { ...collection, visibility: 'Private' });
    await fixture.whenStable();
    expect(visibilityRadio('Sadece linkle').disabled).toBe(true);
    expect(visibilityRadio('Özel').disabled).toBe(false);
  });

  it('shows the fresh counts when the API refuses "public"', async () => {
    fixture.componentRef.setInput('collection', {
      ...collection,
      coinCount: 10,
      photographedCoinCount: 10,
      canBePublic: true,
    });
    await fixture.whenStable();
    visibilityRadio('Herkese açık').click();

    // A coin without photos was added in another tab meanwhile
    button(element(), 'Kaydet').click();
    http.expectOne('/api/collections/5').flush(
      {
        code: 'public_requirements',
        coinCount: 11,
        photographedCoinCount: 10,
        minPublicCoins: 10,
      },
      { status: 400, statusText: 'Bad Request' },
    );
    const fresh = { ...collection, coinCount: 11, photographedCoinCount: 10 };
    (await vi.waitFor(() => http.expectOne('/api/collections/5'))).flush(fresh);

    await vi.waitFor(() => expect(visibilityRadio('Herkese açık').disabled).toBe(true));
    expect(element().querySelector('[role=alert]')!.textContent).toContain('Sayılar güncellendi.');
    expect(visibilityRadio('Sadece linkle').checked).toBe(true);
    expect(element().textContent).toContain("1 coin'in fotoğrafı eksik");

    // The page behind takes the fresh counts too
    pressEscape(dialog());
    await vi.waitFor(() => expect(emitted).toEqual([fresh]));
  });

  it('keeps "public" for a public collection below a raised minimum', async () => {
    fixture.componentRef.setInput('collection', {
      ...collection,
      visibility: 'Public',
      shareToken: null,
    });
    await fixture.whenStable();

    expect(visibilityRadio('Herkese açık').disabled).toBe(false);
  });

  it('closes on Escape without a question when nothing changed', async () => {
    pressEscape(dialog());
    await settle();

    expect(dialog().open).toBe(false);
    expect(confirmDialog()).toBeNull();
    expect(emitted).toEqual([null]);
  });

  it('asks before Escape drops typed changes', async () => {
    const name = element().querySelector<HTMLInputElement>('input[type=text]')!;
    name.value = 'Yeni ad';
    name.dispatchEvent(new Event('input'));

    pressEscape(dialog());
    await vi.waitFor(() => expect(confirmDialog()).not.toBeNull());
    expect(dialog().open).toBe(true);

    button(confirmDialog()!, 'Düzenlemeye devam et').click();
    await settle();
    expect(dialog().open).toBe(true);
    expect(emitted).toEqual([]);

    pressEscape(dialog());
    await vi.waitFor(() => expect(confirmDialog()).not.toBeNull());
    button(confirmDialog()!, 'Kaydetmeden çık').click();
    await vi.waitFor(() => expect(emitted).toEqual([null]));
    expect(dialog().open).toBe(false);
  });

  it('reports a new share link when closed with Escape', async () => {
    button(element(), 'Yeni link oluştur').click();
    await vi.waitFor(() => expect(confirmDialog()).not.toBeNull());
    button(confirmDialog()!, 'Yeni link oluştur').click();
    await vi.waitFor(() =>
      http.expectOne('/api/collections/5/share-token').flush({ shareToken: 'new-token' }),
    );
    await settle();

    pressEscape(dialog());
    await settle();
    expect(emitted).toEqual([{ ...collection, shareToken: 'new-token' }]);
  });

  it('ignores Escape while saving', async () => {
    button(element(), 'Kaydet').click();
    const request = http.expectOne('/api/collections/5');

    pressEscape(dialog());
    await settle();
    expect(dialog().open).toBe(true);
    expect(emitted).toEqual([]);

    request.flush(collection);
    await vi.waitFor(() => expect(emitted).toEqual([collection]));
  });
});
