import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { safeReturnUrl } from '../../core/auth/return-url';
import { httpErrorMessage } from '../../core/http/problem-details';
import { errorMessage, injectFocusFirstInvalid } from '../../shared/form-errors';
import { FieldA11y } from '../../shared/field-a11y';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, FieldA11y, RouterLink, TranslocoPipe],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Bound from the ?returnUrl= query parameter (withComponentInputBinding). */
  readonly returnUrl = input<string>();

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly errorMessage = errorMessage;
  private readonly focusFirstInvalid = injectFocusFirstInvalid();

  protected readonly form = inject(NonNullableFormBuilder).group({
    userNameOrEmail: ['', [Validators.required]],
    password: ['', [Validators.required]],
    // Checked by default: most sign-ins are on the user's own device, and the home screen app
    // would otherwise lose the session whenever it is closed. Unchecked on a shared computer
    rememberMe: [true],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.form.controls.password.reset();
        this.formError.set(this.describeError(err));
      },
    });
  }

  private describeError(err: HttpErrorResponse): string {
    switch (err.status) {
      case 401:
        return translate('login.invalidCredentials');
      case 423:
        // With a code: locked by an admin; without: the temporary lockout after failed attempts
        return (err.error as { code?: string } | null)?.code === 'account_locked'
          ? translate('login.accountLocked')
          : translate('login.lockedOut');
      case 400:
        return translate('errors.requestRejected');
      default:
        return httpErrorMessage(err);
    }
  }
}
