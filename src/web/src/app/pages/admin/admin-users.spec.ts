import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { provideAdminTranslations } from '../../core/admin/admin-translations';
import { AdminUser } from '../../core/admin/admin.models';
import { PagedResponse } from '../../core/coins/coin.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { AdminUsers } from './admin-users';

const user = (userName: string, changes: Partial<AdminUser> = {}): AdminUser => ({
  id: userName,
  userName,
  email: `${userName}@example.com`,
  createdAtUtc: '2026-09-27T12:00:00Z',
  lastSeenAtUtc: null,
  status: 'Active',
  isAdmin: false,
  collectionCount: 2,
  coinCount: 106,
  storageBytes: 5 * 1024 * 1024,
  ...changes,
});

describe('AdminUsers', () => {
  beforeEach(async () => {
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
      ],
      page: 1,
      pageSize: 25,
      totalCount: 2,
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
    expect(text).toContain('2 kullanıcı');
    expect(text).toContain('ayse.yilmaz');
    expect(text).toContain('Admin');
    expect(text).toContain('Kilitli');
    expect(text).toContain('Hiç'); // never seen
    expect(text).toContain('5 MB');
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
});
