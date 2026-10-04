import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { translate } from '@jsverse/transloco';

/** Shape of ASP.NET Core ValidationProblemDetails (only the parts we use). */
interface ValidationProblem {
  title?: string;
  errors?: Record<string, string[]>;
}

/**
 * The message to show for an error key or code: a translation key, or a key with its
 * parameters (e.g. the minimum age).
 */
export type MessageKey = string | { key: string; params: Record<string, unknown> };

function translateKey(message: MessageKey): string {
  return typeof message === 'string' ? translate(message) : translate(message.key, message.params);
}

export interface MappedErrors {
  /** Messages keyed by form control name. */
  fields: Record<string, string>;
  /** Messages that do not belong to a specific control. */
  general: string[];
}

/**
 * Maps a 400 ValidationProblem to form controls.
 * Keys can be DTO property names ("Email", "$.birthDate") or ASP.NET Core
 * Identity error codes ("DuplicateEmail", "PasswordRequiresDigit").
 * The API's own messages are English and never shown: a key without an entry in `messageKeys`
 * gets a generic message ("invalid value" on a field, "not accepted" otherwise).
 *
 * @param controlNames form control names, matched case-insensitively
 * @param codeMap Identity error code -> control name
 * @param messageKeys error key or code -> message to show
 */
export function mapValidationProblem(
  error: HttpErrorResponse,
  controlNames: string[],
  codeMap: Record<string, string> = {},
  messageKeys: Record<string, MessageKey> = {},
): MappedErrors {
  const result: MappedErrors = { fields: {}, general: [] };
  const problem = error.error as ValidationProblem | null;

  if (!problem?.errors) {
    return result;
  }

  for (const rawKey of Object.keys(problem.errors)) {
    const known = messageKeys[rawKey];
    const key = rawKey.replace(/^\$\./, '').toLowerCase();

    const control =
      codeMap[rawKey] ??
      Object.entries(codeMap).find(([code]) => rawKey.startsWith(code))?.[1] ??
      controlNames.find((name) => name.toLowerCase() === key);

    if (control && !result.fields[control]) {
      result.fields[control] = known ? translateKey(known) : translate('validation.invalid');
    } else if (!control) {
      const message = known ? translateKey(known) : translate('errors.invalidRequest');
      if (!result.general.includes(message)) {
        result.general.push(message);
      }
    }
  }

  return result;
}

/** Account-wide limits (UserLimits in the API), whatever the form. */
const CODE_MESSAGE_KEYS: Record<string, string> = {
  collection_limit: 'errors.collectionLimit',
  coin_limit: 'errors.coinLimit',
};

/** The machine code of a coded problem (`this.CodedProblem(code, …)` in the API), if any. */
export function problemCode(error: HttpErrorResponse): string | undefined {
  return (error.error as { code?: string } | null)?.code ?? undefined;
}

/**
 * Applies a failed save response to a reactive form: field errors become a 'server'
 * error on the matching control, everything else is returned as general messages.
 * A coded problem of any status is looked up first: in `messageKeys` (the form's own codes,
 * e.g. 403 moderation_locked), then in the account-wide limits.
 */
export function applyServerErrors(
  form: FormGroup,
  error: HttpErrorResponse,
  codeMap: Record<string, string> = {},
  messageKeys: Record<string, MessageKey> = {},
): string[] {
  const code = problemCode(error);
  const codeKey = code && (messageKeys[code] ?? CODE_MESSAGE_KEYS[code]);
  if (codeKey) {
    return [translateKey(codeKey)];
  }
  if (error.status !== 400 || code) {
    return [httpErrorMessage(error)];
  }

  const mapped = mapValidationProblem(error, Object.keys(form.controls), codeMap, messageKeys);

  for (const [name, message] of Object.entries(mapped.fields)) {
    const control = form.get(name);
    control?.setErrors({ ...control.errors, server: message });
    control?.markAsTouched();
  }

  const general = mapped.general;
  if (!general.length && !Object.keys(mapped.fields).length) {
    // A 400 without a problem body usually means the antiforgery check failed
    general.push(translate('errors.requestRejected'));
  }
  return general;
}

/**
 * Translation key of the generic message for a failed request that has no more specific one.
 * A key, so a signal can hold it and the template translates it in the current language.
 */
export function httpErrorKey(error: HttpErrorResponse): string {
  switch (error.status) {
    case 0:
      return 'errors.network';
    case 403:
      return 'errors.forbidden';
    case 423:
      return 'errors.locked';
    case 429:
      // The API's rate limits (sign-in, sign-up, signed-out reads)
      return 'errors.rateLimited';
    default:
      return 'errors.unexpected';
  }
}

/** Generic message for a failed request that has no more specific one. */
export function httpErrorMessage(error: HttpErrorResponse): string {
  return translate(httpErrorKey(error));
}
