import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { provideAdminTranslations } from '../../core/admin/admin-translations';
import { AdminUserDetail } from '../../core/admin/admin.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { AdminUserDetailPage } from './admin-user-detail';

const jonas = (changes: Partial<AdminUserDetail> = {}): AdminUserDetail => ({
  id: 'u1',
  userName: 'jonas.weber',
  email: 'jonas@example.com',
  firstName: 'Jonas',
  lastName: 'Weber',
  createdAtUtc: '2026-09-27T12:00:00Z',
  lastSeenAtUtc: null,
  lastSignInAtUtc: null,
  status: 'Active',
  isAdmin: false,
  collectionCount: 2,
  coinCount: 10,
  storageBytes: 1024,
  lockedAtUtc: null,
  lockedOutUntilUtc: null,
  publicCollectionCount: 1,
  unlistedCollectionCount: 0,
  photoCount: 3,
  quotaBytes: 300 * 1024 * 1024,
  ...changes,
});

/** Lock, unlock and delete: each asks first (the dialog is stubbed), then reloads or leaves. */
describe('AdminUserDetailPage', () => {
  let http: HttpTestingController;
  let confirmWithNote: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    confirmWithNote = vi.fn().mockResolvedValue('Spam');
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'admin/users/:id', component: AdminUserDetailPage },
            { path: 'admin/users', children: [] },
          ],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
        provideAdminTranslations(),
        { provide: ConfirmDialogService, useValue: { confirmWithNote } },
      ],
    });
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Answers the page's two requests: the user and their history. */
  async function load(user: AdminUserDetail): Promise<void> {
    const request = await vi.waitFor(() => http.expectOne('/api/admin/users/u1'));
    request.flush(user);
    const audit = http.expectOne((r) => r.url === '/api/admin/audit');
    expect(audit.request.params.get('userId')).toBe('u1');
    audit.flush({ items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 });
  }

  async function open(user: AdminUserDetail): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/users/u1');
    await load(user);
    const page = harness.routeNativeElement!;
    // The panel's texts come with their own chunk
    await vi.waitFor(async () => {
      await harness.fixture.whenStable();
      expect(page.textContent).toContain('Kullanıcıyı sil');
    });
    return page;
  }

  const button = (page: HTMLElement, text: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent!.trim() === text,
    )!;

  it('locks after asking, with the note, then shows the new state', async () => {
    const page = await open(jonas());

    button(page, 'Kilitle').click();
    await harness.fixture.whenStable();

    expect(confirmWithNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Kullanıcıyı kilitle', danger: true }),
    );
    const request = http.expectOne('/api/admin/users/u1/lock');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ note: 'Spam' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await harness.fixture.whenStable();
    await load(jonas({ status: 'Locked', lockedAtUtc: '2026-10-04T12:00:00Z' }));
    await harness.fixture.whenStable();

    expect(button(page, 'Kilitle')).toBeUndefined();
    // The pressed button is gone: the focus goes to the first action
    expect(document.activeElement).toBe(button(page, 'Kilidi aç'));
  });

  it('does nothing when the question is cancelled', async () => {
    confirmWithNote.mockResolvedValue(null);
    const page = await open(jonas());

    button(page, 'Kilitle').click();
    await harness.fixture.whenStable();

    http.expectNone('/api/admin/users/u1/lock');
  });

  it('unlocks a locked user', async () => {
    const page = await open(jonas({ status: 'Locked' }));

    button(page, 'Kilidi aç').click();
    await harness.fixture.whenStable();

    const request = http.expectOne('/api/admin/users/u1/lock');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ note: 'Spam' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await load(jonas());
  });

  it('deletes after the name is typed, then goes back to the list', async () => {
    const page = await open(jonas());

    button(page, 'Kullanıcıyı sil').click();
    await harness.fixture.whenStable();

    expect(confirmWithNote).toHaveBeenCalledWith(
      expect.objectContaining({
        typeToConfirm: expect.objectContaining({ value: 'jonas.weber' }),
      }),
    );
    const request = http.expectOne('/api/admin/users/u1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/admin/users'));
  });

  it('says so when an action fails, and stays usable', async () => {
    const page = await open(jonas());

    button(page, 'Kilitle').click();
    await harness.fixture.whenStable();
    http
      .expectOne('/api/admin/users/u1/lock')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await harness.fixture.whenStable();

    await vi.waitFor(async () => {
      await harness.fixture.whenStable();
      expect(page.querySelector('[role=alert]')?.textContent).toContain('İşlem yapılamadı');
    });
    expect(button(page, 'Kilitle').getAttribute('aria-disabled')).toBeNull();
  });
});
