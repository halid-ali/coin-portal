import { Directive, ElementRef, inject, input } from '@angular/core';
import { AbstractControl, NgControl, Validators } from '@angular/forms';

import { errorMessage } from './form-errors';

/**
 * Makes a form field speak to screen readers: ties it to its texts and says when it is invalid
 * or required. The texts are found by the field's id: `<id>-error` (rendered while the error is
 * shown) and `<id>-hint`; a missing one is ignored by assistive technology.
 *
 * `<input id="title" formControlName="title" appField />` with
 * `<p id="title-error" class="form-error">` / `<p id="title-hint" class="form-hint">`.
 * A field without a form directive passes its control: `[appField]="form.controls.x"`.
 */
@Directive({
  selector: '[appField]',
  host: {
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-describedby]': 'describedBy()',
  },
})
export class FieldA11y {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The control, for a field without formControlName / formControl. */
  readonly appField = input<AbstractControl | ''>('');

  private control(): AbstractControl | null {
    return this.ngControl?.control ?? (this.appField() || null);
  }

  /** Invalid exactly when its error text is shown (touched or changed). */
  invalid(): boolean {
    return errorMessage(this.control()) !== null;
  }

  required(): boolean {
    return this.control()?.hasValidator(Validators.required) ?? false;
  }

  describedBy(): string | null {
    const id = this.element.nativeElement.id;
    return id ? `${id}-error ${id}-hint` : null;
  }
}
