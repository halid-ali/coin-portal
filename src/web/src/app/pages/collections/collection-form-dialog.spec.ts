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
