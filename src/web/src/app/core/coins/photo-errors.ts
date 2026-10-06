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

/**
 * A photo error of a coin saved together with its photos (POST api/coins/with-photos), or null:
 * the message, led by the side when the API names it.
 */
export function coinWithPhotosErrorMessage(err: HttpErrorResponse): string | null {
  const body = err.error as { code?: string; side?: string } | null;
  if (!body?.code || !CODES.includes(body.code)) {
    return err.status === 413 ? photoErrorMessage(err) : null;
  }
  const message = photoErrorMessage(err);
  return body.side ? `${translate(`coin.side.${body.side}.label`)}: ${message}` : message;
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

/**
 * Checks a chosen file before it is opened in the cropper; null when it is fine. Only files that
 * are not images at all are turned away: whatever the browser can open is cropped and sent as
 * JPEG, so the cropper decides (the file picker still offers JPG and PNG). No size check either:
 * the API's limit applies to the cropped result.
 */
export function validatePhotoFile(file: File): string | null {
  // Some pickers give no type at all; the cropper tries those
  return file.type && !file.type.startsWith('image/') ? translate('photo.errors.wrongType') : null;
}

/**
 * HEIC/HEIF (iPhone and some Android cameras): Safari opens them, Chrome does not. iOS converts
 * them to JPEG when the picker asks for JPG/PNG, so this is mostly Android and desktop Chrome.
 */
export function isHeic(file: File): boolean {
  return /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}
