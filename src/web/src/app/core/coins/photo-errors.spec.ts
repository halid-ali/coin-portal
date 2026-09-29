import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { provideTestTransloco, useTestLanguage } from '../i18n/testing';
import { photoErrorMessage, validatePhotoFile } from './photo-errors';

describe('photo errors', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  it('maps API error codes to messages', () => {
    const err = new HttpErrorResponse({ status: 400, error: { code: 'quota_exceeded' } });
    expect(photoErrorMessage(err)).toContain('saklama alanın doldu');
  });

  it('falls back to a generic message', () => {
    const err = new HttpErrorResponse({ status: 500, error: null });
    expect(photoErrorMessage(err)).toBe('Fotoğraf kaydedilemedi. Lütfen tekrar dene.');
  });

  it('accepts only JPG/PNG up to 10 MB', () => {
    const file = (type: string, size = 1000) => new File([new Uint8Array(size)], 'x', { type });
    expect(validatePhotoFile(file('image/jpeg'))).toBeNull();
    expect(validatePhotoFile(file('image/png'))).toBeNull();
    expect(validatePhotoFile(file('image/gif'))).toContain('JPG veya PNG');
    expect(validatePhotoFile(file('image/png', 11 * 1024 * 1024))).toContain('10 MB');
  });
});
