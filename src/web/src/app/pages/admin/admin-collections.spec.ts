import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideAdminTranslations } from '../../core/admin/admin-translations';
import { AdminCollection, AdminStats } from '../../core/admin/admin.models';
import { PagedResponse } from '../../core/coins/coin.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { AdminCollections } from './admin-collections';

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
});
