import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideAdminTranslations } from '../../core/admin/admin-translations';
import { AdminCollection, AdminStats } from '../../core/admin/admin.models';
import { PagedResponse } from '../../core/coins/coin.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { AdminCollections } from './admin-collections';
import { SKELETON_DELAY_MS } from '../../shared/skeleton';

describe('AdminCollections', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCollections],
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

  it('says how many private collections it does not list', async () => {
    const fixture = TestBed.createComponent(AdminCollections);
    await fixture.whenStable();
    const http = TestBed.inject(HttpTestingController);

    const empty: PagedResponse<AdminCollection> = {
      items: [],
      page: 1,
      pageSize: 25,
      totalCount: 5,
      totalPages: 1,
    };
    http.expectOne((r) => r.url === '/api/admin/collections').flush(empty);
    // 16 in all: 3 public, 1 link only, 1 hidden (listed) and 11 private (not listed)
    http.expectOne('/api/admin/stats').flush({
      collectionCount: 16,
      publicCollectionCount: 3,
      unlistedCollectionCount: 1,
      hiddenCollectionCount: 1,
    } as AdminStats);

    await vi.waitFor(async () => {
      await fixture.whenStable();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('5 koleksiyon');
      expect(text).toContain('11 özel koleksiyon listelenmez');
    });
  });

  it('shows placeholder rows on the first load, then the list', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const fixture = TestBed.createComponent(AdminCollections);
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
        .expectOne((r) => r.url === '/api/admin/collections')
        .flush({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 });
      http.expectOne('/api/admin/stats').flush({} as AdminStats);
      await fixture.whenStable();
      expect(element.querySelectorAll('.skeleton')).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
