import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { provideTestTransloco, useTestLanguage } from '../i18n/testing';
import { isHeic, photoErrorMessage, validatePhotoFile } from './photo-errors';

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

  const file = (type: string, name = 'x', size = 1000) =>
    new File([new Uint8Array(size)], name, { type });

  it('leaves images of any size to the cropper and turns away other files', () => {
    expect(validatePhotoFile(file('image/jpeg'))).toBeNull();
    expect(validatePhotoFile(file('image/png'))).toBeNull();
    expect(validatePhotoFile(file('image/webp'))).toBeNull();
    // A 50 MP phone photo: the API's 10 MB limit applies to the cropped JPEG only
    expect(validatePhotoFile(file('image/jpeg', 'x', 25 * 1024 * 1024))).toBeNull();
    // Some pickers give no type
    expect(validatePhotoFile(file(''))).toBeNull();
    expect(validatePhotoFile(file('application/pdf'))).toContain('JPG veya PNG');
  });

  it('recognizes HEIC/HEIF by type or file name', () => {
    expect(isHeic(file('image/heic'))).toBe(true);
    expect(isHeic(file('image/heif-sequence'))).toBe(true);
    expect(isHeic(file('', 'IMG_0001.HEIC'))).toBe(true);
    expect(isHeic(file('', 'photo.heif'))).toBe(true);
    expect(isHeic(file('image/jpeg', 'IMG_0001.jpg'))).toBe(false);
  });
});
