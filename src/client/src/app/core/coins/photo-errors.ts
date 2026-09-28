import { HttpErrorResponse } from '@angular/common/http';
import { translate } from '@jsverse/transloco';

import { httpErrorMessage } from '../http/problem-details';
import { PHOTO_LIMITS } from './coin.models';

const MAX_MB = PHOTO_LIMITS.maxUploadBytes / (1024 * 1024);

/** The API adds a machine readable "code" to photo errors (see CoinPhotosController). */
const CODES = ['file_missing', 'file_too_large', 'invalid_image', 'quota_exceeded', 'conflict'];

function codeMessage(code: string): string {
  return translate(`photo.errors.${code}`, { mb: MAX_MB });
}

export function photoErrorMessage(err: HttpErrorResponse): string {
  const code = (err.error as { code?: string } | null)?.code;
  if (code && CODES.includes(code)) {
    return codeMessage(code);
  }
  if (err.status === 0) {
    return httpErrorMessage(err);
  }
  return err.status === 413 ? codeMessage('file_too_large') : translate('photo.errors.saveFailed');
}

/** Checks a chosen file before it is opened in the cropper; null when it is fine. */
export function validatePhotoFile(file: File): string | null {
  if (!(PHOTO_LIMITS.acceptedTypes as readonly string[]).includes(file.type)) {
    return translate('photo.errors.wrongType');
  }
  if (file.size > PHOTO_LIMITS.maxUploadBytes) {
    return codeMessage('file_too_large');
  }
  return null;
}
