import { HttpErrorResponse } from '@angular/common/http';

import { PHOTO_LIMITS } from './coin.models';

const MB = 1024 * 1024;

/** The API adds a machine readable "code" to photo errors (see CoinPhotosController). */
const MESSAGES: Record<string, string> = {
  file_missing: 'Fotoğraf dosyası gönderilemedi.',
  file_too_large: `Fotoğraf en fazla ${PHOTO_LIMITS.maxUploadBytes / MB} MB olabilir.`,
  invalid_image: 'Fotoğraf işlenemedi. JPG veya PNG olmalı ve çok küçük olmamalı.',
  quota_exceeded: 'Fotoğraf saklama alanın doldu. Yer açmak için bazı fotoğrafları silebilirsin.',
  conflict: 'Fotoğraf aynı anda başka bir yerden değiştirildi. Tekrar dene.',
};

export function photoErrorMessage(err: HttpErrorResponse): string {
  const code = (err.error as { code?: string } | null)?.code;
  if (code && MESSAGES[code]) {
    return MESSAGES[code];
  }
  if (err.status === 0) {
    return 'Sunucuya ulaşılamıyor. Bağlantını kontrol et.';
  }
  return err.status === 413
    ? MESSAGES['file_too_large']
    : 'Fotoğraf kaydedilemedi. Lütfen tekrar dene.';
}

/** Checks a chosen file before it is opened in the cropper; null when it is fine. */
export function validatePhotoFile(file: File): string | null {
  if (!(PHOTO_LIMITS.acceptedTypes as readonly string[]).includes(file.type)) {
    return 'Sadece JPG veya PNG fotoğraf seçebilirsin.';
  }
  if (file.size > PHOTO_LIMITS.maxUploadBytes) {
    return MESSAGES['file_too_large'];
  }
  return null;
}
