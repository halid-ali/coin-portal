import { HttpErrorResponse } from '@angular/common/http';

import { Collection } from './collection.models';
import { collectionErrorMessage, coverUrl } from './collection.service';

describe('collection helpers', () => {
  const collection = (cover: Collection['cover'], coverImageId: string | null = null) =>
    ({ id: 1, cover, coverImageId }) as Collection;

  it('builds the cover URL from the cover photo', () => {
    expect(coverUrl(collection({ coinId: 9, side: 'National', id: 'p1' }), 'preview')).toBe(
      '/api/coins/9/photos/national/preview?v=p1',
    );
    expect(coverUrl(collection(null), 'preview')).toBeNull();
  });

  it('prefers the uploaded cover', () => {
    const auto = { coinId: 9, side: 'National' as const, id: 'p1' };
    expect(coverUrl(collection(auto, 'c7'), 'preview')).toBe('/api/collections/1/cover?v=c7');
  });

  it('maps API error codes to messages', () => {
    const err = (status: number, code?: string) =>
      new HttpErrorResponse({ status, error: code ? { code } : null });
    expect(collectionErrorMessage(err(400, 'last_collection'))).toContain('Tek koleksiyonun');
    expect(collectionErrorMessage(err(400, 'invalid_target'))).toContain('taşınacağı');
    expect(collectionErrorMessage(err(404))).toContain('bulunamadı');
    expect(collectionErrorMessage(err(500))).toContain('Beklenmeyen');
  });
});
