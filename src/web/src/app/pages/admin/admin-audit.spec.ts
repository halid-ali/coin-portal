import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideAdminTranslations } from '../../core/admin/admin-translations';
import { AdminAuditEntry } from '../../core/admin/admin.models';
import { PagedResponse } from '../../core/coins/coin.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { AdminAudit } from './admin-audit';
import { SKELETON_DELAY_MS } from '../../shared/skeleton';

const entry = (id: number, changes: Partial<AdminAuditEntry>): AdminAuditEntry => ({
  id,
  createdAtUtc: '2026-10-01T12:00:00Z',
  actorId: 'admin-id',
  actorUserName: 'ayse.yilmaz',
  action: 'UserLocked',
  targetUserId: 'user-id',
  targetUserName: 'jonas.weber',
  targetCollectionId: null,
  targetCollectionName: null,
  setting: null,
  oldValue: null,
  newValue: null,
  note: null,
  ...changes,
});

describe('AdminAudit', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAudit],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
        provideAdminTranslations(),
      ],
    }).compileComponents();
    await useTestLanguage('tr');
  });

  it('shows deleted users without their names and without a link', async () => {
    const fixture = TestBed.createComponent(AdminAudit);
    await fixture.whenStable();
    const page: PagedResponse<AdminAuditEntry> = {
      items: [
        entry(3, { action: 'UserDeleted', targetUserName: null, note: 'Spam' }),
        entry(2, { action: 'CollectionHidden', targetUserName: null, targetCollectionId: 7 }),
        entry(1, { actorUserName: null }),
      ],
      page: 1,
      pageSize: 50,
      totalCount: 3,
      totalPages: 1,
    };
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/admin/audit')
      .flush(page);

    const element = fixture.nativeElement as HTMLElement;
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(element.textContent).toContain('Kullanıcı silindi');
    });
    const text = element.textContent ?? '';
    expect(text).toContain('Silinmiş kullanıcı');
    expect(text).toContain('silinmiş koleksiyon');
    expect(text).toContain('Spam');
    // The only remaining name is a link; the deleted ones are plain text
    const links = [...element.querySelectorAll('a')].map((a) => a.textContent!.trim());
    expect(links.filter((l) => l.startsWith('@'))).toEqual(['@jonas.weber', '@jonas.weber']);
    expect(text).not.toContain('@null');
  });

  it('shows placeholder rows on the first load, then the list', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const fixture = TestBed.createComponent(AdminAudit);
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
        .expectOne((r) => r.url === '/api/admin/audit')
        .flush({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 });
      await fixture.whenStable();
      expect(element.querySelectorAll('.skeleton')).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
