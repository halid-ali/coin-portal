import { ElementRef, Injector, afterNextRender, inject } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { translate } from '@jsverse/transloco';

/**
 * Turns the first validation error of a control into a message in the active language.
 * "server" errors are already translated when they are set (applyServerErrors).
 */
export function errorMessage(control: AbstractControl | null): string | null {
  if (!control?.errors || !(control.touched || control.dirty)) {
    return null;
  }
  const e = control.errors;

  if (e['server']) return e['server'] as string;
  if (e['required']) return translate('validation.required');
  if (e['email']) return translate('validation.email');
  if (e['minlength'])
    return translate('validation.minLength', { min: e['minlength'].requiredLength });
  if (e['maxlength'])
    return translate('validation.maxLength', { max: e['maxlength'].requiredLength });
  if (e['pattern']) return translate('validation.pattern');
  if (e['minAge']) return translate('validation.minAge', { age: e['minAge'].required });
  if (e['futureDate']) return translate('validation.futureDate');
  if (e['maxAge']) return translate('validation.maxAge');
  if (e['passwordStrength']) return translate('validation.passwordStrength');
  if (e['passwordMismatch']) return translate('validation.passwordMismatch');
  if (e['min']) return translate('validation.min', { min: e['min'].min });
  if (e['max']) return translate('validation.max', { max: e['max'].max });
  if (e['integer']) return translate('validation.integer');

  return translate('validation.invalid');
}

/**
 * For a form component's field initializer. The returned function, called after a submit with
 * invalid fields (or field errors from the server), focuses the first invalid field once its
 * error is rendered: a screen reader reads the field with its error (FieldA11y's
 * aria-describedby) and keyboard users land where the problem is.
 */
export function injectFocusFirstInvalid(): () => void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const injector = inject(Injector);
  return () =>
    afterNextRender(() => host.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), {
      injector,
    });
}
