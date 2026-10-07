import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { MessageKey, applyServerErrors } from '../../core/http/problem-details';
import { FieldA11y } from '../../shared/field-a11y';
import { errorMessage, injectFocusFirstInvalid } from '../../shared/form-errors';
import { notBlankValidator } from '../../shared/validators';

// The API's keys (ForgotPasswordRequest); the form checks the same first
const MESSAGE_KEYS: Record<string, MessageKey> = {
  UserNameOrEmail: 'validation.required',
};

/**
 * "Forgot password": asks for a reset link. The page that follows is the same whether an account
 * matched or not (the API tells nothing about the account either).
 */
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, FieldA11y, RouterLink, TranslocoPipe],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly formErrors = signal<string[]>([]);
  protected readonly errorMessage = errorMessage;
  private readonly focusFirstInvalid = injectFocusFirstInvalid();
  private readonly injector = inject(Injector);
  private readonly sentHeading = viewChild<ElementRef<HTMLElement>>('sentHeading');
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('userNameOrEmail');

  protected readonly form = inject(NonNullableFormBuilder).group({
    // What was typed on the sign-in page, if anything (its link passes it as navigation state)
    userNameOrEmail: [
      initialValue(inject(Router).currentNavigation()?.extras.state?.['userNameOrEmail']),
      [Validators.required, notBlankValidator, Validators.maxLength(256)],
    ],
  });

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.submitting.set(true);
    this.formErrors.set([]);
    this.auth.forgotPassword(this.form.controls.userNameOrEmail.value.trim()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
        // The form is gone: the focus goes to what replaced it
        this.focusAfterRender(() => this.sentHeading());
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.formErrors.set(applyServerErrors(this.form, err, {}, MESSAGE_KEYS));
        this.focusFirstInvalid();
      },
    });
  }

  /** Back to the form, the value kept: a typo, or the e-mail did not come. */
  protected tryAgain(): void {
    this.sent.set(false);
    this.focusAfterRender(() => this.input());
  }

  private focusAfterRender(target: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => target()?.nativeElement.focus(), { injector: this.injector });
  }
}

function initialValue(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 256) : '';
}
