import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Meta } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { PasswordResetDoneState } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import {
  MessageKey,
  applyServerErrors,
  httpErrorKey,
  problemCode,
} from '../../core/http/problem-details';
import { firstQueryParam } from '../../core/http/query-params';
import { FieldA11y } from '../../shared/field-a11y';
import { PasswordField } from '../../shared/password-field/password-field';
import { errorMessage, injectFocusFirstInvalid } from '../../shared/form-errors';
import { passwordMatchValidator, passwordStrengthValidator } from '../../shared/validators';

// ResetPasswordRequest.NewPassword in the API
const MAX_PASSWORD_LENGTH = 100;

// Identity's error codes -> the field (prefix match, e.g. "PasswordRequiresDigit")
const IDENTITY_CODE_MAP: Record<string, string> = { Password: 'newPassword' };

// Like the sign-up's: the form checks the same rules first
const MESSAGE_KEYS: Record<string, MessageKey> = {
  PasswordTooShort: { key: 'validation.minLength', params: { min: 8 } },
  PasswordRequiresDigit: 'validation.passwordStrength',
  PasswordRequiresLower: 'validation.passwordStrength',
  PasswordRequiresUpper: 'validation.passwordStrength',
  NewPassword: { key: 'validation.maxLength', params: { max: MAX_PASSWORD_LENGTH } },
};

type ResetState = 'checking' | 'ready' | 'invalid' | 'failed';

/**
 * The link from the password reset e-mail (/reset-password?token=…): says whose password it sets,
 * then sets the new one and leads to the sign-in. The secret leaves the address bar at once and
 * stays in memory for the save.
 */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, FieldA11y, PasswordField, RouterLink, TranslocoPipe],
  templateUrl: './reset-password.html',
})
export class ResetPassword implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Bound from ?token= (withComponentInputBinding). */
  readonly token = input(undefined, { transform: firstQueryParam });

  protected readonly state = signal<ResetState>('checking');
  protected readonly userName = signal('');
  protected readonly errorKey = signal('errors.unexpected');
  protected readonly submitting = signal(false);
  protected readonly formErrors = signal<string[]>([]);
  protected readonly errorMessage = errorMessage;
  private readonly focusFirstInvalid = injectFocusFirstInvalid();
  private secret = '';

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(MAX_PASSWORD_LENGTH),
          passwordStrengthValidator,
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator('newPassword', 'confirmPassword') },
  );

  constructor() {
    // A one-time link: nothing for search engines
    const meta = inject(Meta);
    meta.addTag({ name: 'robots', content: 'noindex' });
    inject(DestroyRef).onDestroy(() => meta.removeTag('name="robots"'));
  }

  ngOnInit(): void {
    const token = this.token();
    if (!token) {
      this.state.set('invalid');
      return;
    }
    this.secret = token;
    // The secret out of the address bar and the history
    void this.router.navigate([], { queryParams: { token: null }, replaceUrl: true });
    this.auth.checkPasswordReset(token).subscribe({
      next: ({ userName }) => {
        this.userName.set(userName);
        this.state.set('ready');
      },
      error: (err: HttpErrorResponse) => this.showError(err),
    });
  }

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
    this.auth.resetPassword(this.secret, this.form.controls.newPassword.value).subscribe({
      next: () => {
        const state: PasswordResetDoneState = {
          notice: 'passwordReset',
          userName: this.userName(),
        };
        void this.router.navigateByUrl('/login', { state });
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        if (problemCode(err) === 'invalid_token') {
          // Expired while the page was open, or used in another tab
          this.state.set('invalid');
          return;
        }
        this.formErrors.set(applyServerErrors(this.form, err, IDENTITY_CODE_MAP, MESSAGE_KEYS));
        this.focusFirstInvalid();
      },
    });
  }

  private showError(err: HttpErrorResponse): void {
    if (problemCode(err) === 'invalid_token') {
      this.state.set('invalid');
    } else {
      this.errorKey.set(httpErrorKey(err));
      this.state.set('failed');
    }
  }
}
