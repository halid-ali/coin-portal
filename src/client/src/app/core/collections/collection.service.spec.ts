import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { provideTestTransloco, useTestLanguage } from '../i18n/testing';
import { collectionErrorMessage, coverUrl } from './collection.service';

describe('collection helpers', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  it('builds the URL of the uploaded cover', () => {
    expect(coverUrl({ id: 1, coverImageId: 'c7' })).toBe('/api/collections/1/cover?v=c7');
    expect(coverUrl({ id: 1, coverImageId: 'c7' }, 'a/b')).toBe(
      '/api/collections/1/cover?v=c7&s=a%2Fb',
    );
  });

  it('has no cover URL without an uploaded cover (default picture)', () => {
    expect(coverUrl({ id: 1, coverImageId: null })).toBeNull();
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
