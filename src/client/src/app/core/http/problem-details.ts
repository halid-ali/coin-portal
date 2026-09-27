import { HttpErrorResponse } from '@angular/common/http';

/** Shape of ASP.NET Core ValidationProblemDetails (only the parts we use). */
interface ValidationProblem {
  title?: string;
  errors?: Record<string, string[]>;
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
 *
 * @param controlNames form control names, matched case-insensitively
 * @param codeMap Identity error code -> control name
 * @param messageOverrides Identity error code -> localized message
 */
export function mapValidationProblem(
  error: HttpErrorResponse,
  controlNames: string[],
  codeMap: Record<string, string> = {},
  messageOverrides: Record<string, string> = {},
): MappedErrors {
  const result: MappedErrors = { fields: {}, general: [] };
  const problem = error.error as ValidationProblem | null;

  if (!problem?.errors) {
    return result;
  }

  for (const [rawKey, messages] of Object.entries(problem.errors)) {
    const message = messageOverrides[rawKey] ?? messages[0];
    const key = rawKey.replace(/^\$\./, '').toLowerCase();

    const control =
      codeMap[rawKey] ??
      Object.entries(codeMap).find(([code]) => rawKey.startsWith(code))?.[1] ??
      controlNames.find((name) => name.toLowerCase() === key);

    if (control && !result.fields[control]) {
      result.fields[control] = message;
    } else if (!control) {
      result.general.push(message);
    }
  }

  return result;
}