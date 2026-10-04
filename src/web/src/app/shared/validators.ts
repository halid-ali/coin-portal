import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Same rule as the API: English letters (no accents), digits and . _ - (no @ so login can tell
 * it from an email).
 */
export const USER_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

const MAX_AGE = 120;

/**
 * Age in full years for an ISO date string (yyyy-MM-dd), on the UTC date of `today`: the API
 * checks the age against the UTC date, so both agree also around midnight (Turkey is UTC+3).
 */
export function ageOn(birthDate: string, today: Date = new Date()): number {
  const [year, month, day] = birthDate.split('-').map(Number);
  let age = today.getUTCFullYear() - year;
  const hadBirthday =
    today.getUTCMonth() + 1 > month ||
    (today.getUTCMonth() + 1 === month && today.getUTCDate() >= day);
  if (!hadBirthday) {
    age--;
  }
  return age;
}

/** Latest allowed birth date (yyyy-MM-dd) for the given minimum age, used as the input's max. */
export function latestBirthDate(minAge: number, today: Date = new Date()): string {
  const d = new Date(
    Date.UTC(today.getUTCFullYear() - minAge, today.getUTCMonth(), today.getUTCDate()),
  );
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * "required" also for a value of only spaces: the API's [Required] rejects it, Angular's
 * Validators.required does not.
 */
export function notBlankValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string | null;
  return value && !value.trim() ? { required: true } : null;
}

/** Whole numbers only (a number input also takes 2006.5). Empty values are left to "required". */
export function integerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as number | string | null;
  return value === null || value === '' || Number.isInteger(Number(value))
    ? null
    : { integer: true };
}

/** Mirrors [MinimumAge] on the API: rejects future dates, under-age and implausible ages. */
export function minimumAgeValidator(minAge: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null; // "required" handles empty values
    }
    const age = ageOn(value);
    if (age < 0) {
      return { futureDate: true };
    }
    if (age > MAX_AGE) {
      return { maxAge: { max: MAX_AGE } };
    }
    return age < minAge ? { minAge: { required: minAge, actual: age } } : null;
  };
}

/**
 * Mirrors the ASP.NET Core Identity defaults (digit, lower case, upper case).
 * Adjust if the password options in Program.cs change.
 */
export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string | null;
  if (!value) {
    return null;
  }
  const missing = {
    digit: !/\d/.test(value),
    lower: !/[a-z]/.test(value),
    upper: !/[A-Z]/.test(value),
  };
  return missing.digit || missing.lower || missing.upper ? { passwordStrength: missing } : null;
}

/** Group validator: sets "passwordMismatch" on the confirm control when the two differ. */
export function passwordMatchValidator(passwordKey: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey);
    const confirm = group.get(confirmKey);
    if (!password || !confirm) {
      return null;
    }

    const mismatch = !!confirm.value && password.value !== confirm.value;
    const { passwordMismatch: _, ...otherErrors } = confirm.errors ?? {};

    if (mismatch) {
      confirm.setErrors({ ...otherErrors, passwordMismatch: true });
    } else {
      confirm.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
    }
    return null;
  };
}
