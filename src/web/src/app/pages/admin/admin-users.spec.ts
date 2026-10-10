import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { provideAdminTranslations } from '../../core/admin/admin-translations';
import { AdminUser } from '../../core/admin/admin.models';
import { PagedResponse } from '../../core/coins/coin.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { AdminUsers } from './admin-users';
import { SKELETON_DELAY_MS } from '../../shared/skeleton';

const user = (userName: string, changes: Partial<AdminUser> = {}): AdminUser => ({
  id: userName,
  userName,
  email: `${userName}@example.com`,
  createdAtUtc: '2026-09-27T12:00:00Z',
  lastSeenAtUtc: null,
  status: 'Active',
  isAdmin: false,
  emailConfirmed: true,
  collectionCount: 2,
  coinCount: 106,
  storageBytes: 5 * 1024 * 1024,
  ...changes,
});

describe('AdminUsers', () => {
  let confirmWithNote: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    confirmWithNote = vi.fn().mockResolvedValue('Spam wave');
    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [
        provideRouter(
          [{ path: 'admin/users', component: AdminUsers }],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
        provideAdminTranslations(),
        { provide: ConfirmDialogService, useValue: { confirmWithNote } },
      ],
    }).compileComponents();
    await useTestLanguage('tr');
  });

  it('asks for the default view and shows the users', async () => {
    const fixture = TestBed.createComponent(AdminUsers);
    await fixture.whenStable();

    const request = TestBed.inject(HttpTestingController).expectOne(
      (r) => r.url === '/api/admin/users',
    );
    expect(request.request.params.toString()).toBe('sort=CreatedAt&dir=Desc&page=1&pageSize=25');
    const page: PagedResponse<AdminUser> = {
      items: [
        user('ayse.yilmaz', { isAdmin: true }),
        user('jonas.weber', { status: 'Locked', lastSeenAtUtc: new Date().toISOString() }),
        // Locked and never verified: the status says locked, the mark says unverified
        user('spam.account', { status: 'Locked', emailConfirmed: false }),
        user('new.user', { status: 'Unverified', emailConfirmed: false }),
      ],
      page: 1,
      pageSize: 25,
      totalCount: 4,
      totalPages: 1,
    };
    request.flush(page);

    // The scope's texts arrive with their own lazy chunk (the real loader, as on the route)
    let text = '';
    await vi.waitFor(async () => {
      await fixture.whenStable();
      text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Kilitli');
    });
    expect(text).toContain('4 kullanıcı');
    expect(text).toContain('Doğrulanmamış');
    // On the table and the phone cards, once per unverified user
    const element = fixture.nativeElement as HTMLElement;
    const marks = [...element.querySelectorAll('app-unverified-mark')];
    expect(marks).toHaveLength(4);
    expect(marks.every((m) => m.textContent!.includes('E-posta doğrulanmamış'))).toBe(true);
    const rows = [...element.querySelectorAll('tbody tr')];
    expect(rows.map((r) => r.querySelector('app-unverified-mark') !== null)).toEqual([
      false,
      false,
      true,
      true,
    ]);
    expect(text).toContain('ayse.yilmaz');
    expect(text).toContain('Admin');
    expect(text).toContain('Kilitli');
    expect(text).toContain('Hiç'); // never seen
    expect(text).toContain('5 MB');
  });

  it('offers the filters and the sort as lists without typing, named in the panel texts', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/users?emailConfirmed=false');
    const http = TestBed.inject(HttpTestingController);
    const empty = { items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 };
    http.expectOne((r) => r.url === '/api/admin/users').flush(empty);
    const element = harness.fixture.nativeElement as HTMLElement;
    const box = (id: string) => element.querySelector<HTMLButtonElement>('#' + id)!;
    // The box's first line (a fitted box also holds every name, hidden, for its width)
    const shown = (id: string) => box(id).querySelector('span')!.textContent!.trim();

    // List-only comboboxes since 2026-10-10 (were selects); the names come with the panel's texts
    await vi.waitFor(async () => {
      await harness.fixture.whenStable();
      expect(shown('admin-user-email')).toBe('E-postası doğrulanmamış');
    });
    expect(box('admin-user-status').tagName).toBe('BUTTON');
    expect(shown('admin-user-status')).toBe('Tüm durumlar');
    expect(shown('admin-user-sort')).toBe('En yeni kayıt');

    box('admin-user-status').click();
    await harness.fixture.whenStable();
    const options = [...element.querySelectorAll<HTMLElement>('[role=option]')];
    expect(options.map((o) => o.textContent!.trim())).toEqual([
      'Tüm durumlar',
      'Aktif',
      'Doğrulanmamış',
      'Geçici kilitli',
      'Kilitli',
    ]);
    options[4].click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/admin/users?emailConfirmed=false&status=Locked');
    const filtered = http.expectOne((r) => r.url === '/api/admin/users');
    expect(filtered.request.params.get('status')).toBe('Locked');
    filtered.flush(empty);
  });

  it('filters by the e-mail address, and deletes the selected users at once', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/users?emailConfirmed=false');
    const http = TestBed.inject(HttpTestingController);
    const page = (items: AdminUser[]): PagedResponse<AdminUser> => ({
      items,
      page: 1,
      pageSize: 25,
      totalCount: items.length,
      totalPages: 1,
    });

    const request = http.expectOne((r) => r.url === '/api/admin/users');
    expect(request.request.params.get('emailConfirmed')).toBe('false');
    request.flush(
      page([
        user('spam.one', { id: 's1', emailConfirmed: false }),
        user('spam.two', { id: 's2', emailConfirmed: false }),
        user('root', { id: 'a1', isAdmin: true, emailConfirmed: false }),
      ]),
    );
    const element = harness.fixture.nativeElement as HTMLElement;
    await vi.waitFor(async () => {
      await harness.fixture.whenStable();
      expect(element.textContent).toContain('0 kullanıcı seçili');
    });

    // Admins cannot be selected: the header box takes the other two
    const tableBoxes = () => [...element.querySelectorAll<HTMLInputElement>('table input')];
    expect(tableBoxes()).toHaveLength(3);
    tableBoxes()[0].click();
    await harness.fixture.whenStable();
    expect(element.textContent).toContain('2 kullanıcı seçili');

    const deleteButton = [...element.querySelectorAll('button')].find((b) =>
      b.textContent!.includes('Seçilenleri sil'),
    )!;
    deleteButton.click();
    await vi.waitFor(() => expect(confirmWithNote).toHaveBeenCalled());
    // The count must be typed to confirm
    expect(confirmWithNote.mock.calls[0][0].typeToConfirm.value).toBe('2');

    const deletion = await vi.waitFor(() =>
      http.expectOne((r) => r.url === '/api/admin/users/bulk-delete'),
    );
    expect(deletion.request.body).toEqual({ userIds: ['s1', 's2'], note: 'Spam wave' });
    deletion.flush({ deleted: 2, skippedAdmins: 0, notFound: 0 });

    // The list loads again
    const reload = await vi.waitFor(() => http.expectOne((r) => r.url === '/api/admin/users'));
    reload.flush(page([user('root', { id: 'a1', isAdmin: true, emailConfirmed: false })]));
    await vi.waitFor(async () => {
      await harness.fixture.whenStable();
      expect(element.textContent).toContain('2 hesap silindi.');
    });
    expect(document.activeElement?.getAttribute('role')).toBe('status');
  });

  it('goes to the last page when the page is past it, with the first of repeated params', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/users?page=4&search=ayse&search=jonas');
    const http = TestBed.inject(HttpTestingController);

    const request = http.expectOne((r) => r.url === '/api/admin/users');
    expect(request.request.params.get('search')).toBe('ayse');
    request.flush({ items: [], page: 4, pageSize: 25, totalCount: 30, totalPages: 2 });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin/users?page=2&search=ayse&search=jonas');
    const reload = http.expectOne((r) => r.url === '/api/admin/users');
    expect(reload.request.params.get('page')).toBe('2');
    reload.flush({
      items: [user('ayse.yilmaz')],
      page: 2,
      pageSize: 25,
      totalCount: 30,
      totalPages: 2,
    });
  });

  it('shows placeholder rows on the first load, then the list', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const fixture = TestBed.createComponent(AdminUsers);
      await fixture.whenStable();
      vi.advanceTimersByTime(SKELETON_DELAY_MS);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;

      // The table (wide screens) and the cards, ten rows each until the list is known
      expect(element.querySelectorAll('tbody tr[aria-hidden=true]')).toHaveLength(10);
      expect(element.querySelectorAll('ul > li[aria-hidden=true]')).toHaveLength(10);
      expect(element.querySelector('[role=status].sr-only')).not.toBeNull();

      const http = TestBed.inject(HttpTestingController);
      http
        .expectOne((r) => r.url === '/api/admin/users')
        .flush({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 });
      await fixture.whenStable();
      expect(element.querySelectorAll('.skeleton')).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
