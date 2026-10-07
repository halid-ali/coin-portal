import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { MessageKey, applyServerErrors } from '../../core/http/problem-details';
import { errorMessage, injectFocusFirstInvalid } from '../../shared/form-errors';
import { FieldA11y } from '../../shared/field-a11y';
import { PasswordField } from '../../shared/password-field/password-field';
import {
  USER_NAME_PATTERN,
  latestBirthDate,
  minimumAgeValidator,
  notBlankValidator,
  passwordMatchValidator,
  passwordStrengthValidator,
} from '../../shared/validators';

const MIN_AGE = 18;
// RegisterRequest.Password in the API
const MAX_PASSWORD_LENGTH = 100;

// ASP.NET Core Identity error codes -> form controls (prefix match, e.g. "PasswordRequiresDigit")
const IDENTITY_CODE_MAP: Record<string, string> = {
  DuplicateEmail: 'email',
  InvalidEmail: 'email',
  DuplicateUserName: 'userName',
  InvalidUserName: 'userName',
  Password: 'password',
};

// The API's error keys and Identity's error codes -> messages (the API's own are English and
// never shown). The form checks the same rules first, so most of these only show when the two
// disagree (an older page, a rule changed on one side).
const REGISTER_MESSAGE_KEYS: Record<string, MessageKey> = {
  DuplicateEmail: 'register.duplicateEmail',
  DuplicateUserName: 'register.duplicateUserName',
  InvalidUserName: 'register.invalidUserName',
  InvalidEmail: 'validation.email',
  PasswordTooShort: { key: 'validation.minLength', params: { min: 8 } },
  PasswordRequiresDigit: 'validation.passwordStrength',
  PasswordRequiresLower: 'validation.passwordStrength',
  PasswordRequiresUpper: 'validation.passwordStrength',
  FirstName: 'validation.required',
  LastName: 'validation.required',
  UserName: 'register.invalidUserName',
  Email: 'validation.email',
  BirthDate: { key: 'validation.minAge', params: { age: MIN_AGE } },
  // Only the upper limit: the form checks the minimum length itself
  Password: { key: 'validation.maxLength', params: { max: MAX_PASSWORD_LENGTH } },
  AcceptTerms: 'register.privacyRequired',
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, FieldA11y, PasswordField, RouterLink, TranslocoPipe],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly formErrors = signal<string[]>([]);
  protected readonly errorMessage = errorMessage;
  private readonly focusFirstInvalid = injectFocusFirstInvalid();
  protected readonly minAge = MIN_AGE;
  protected readonly maxBirthDate = latestBirthDate(MIN_AGE);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      firstName: ['', [Validators.required, notBlankValidator, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, notBlankValidator, Validators.maxLength(100)]],
      userName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          Validators.pattern(USER_NAME_PATTERN),
        ],
      ],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      birthDate: ['', [Validators.required, minimumAgeValidator(MIN_AGE)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(MAX_PASSWORD_LENGTH),
          passwordStrengthValidator,
        ],
      ],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    },
    { validators: passwordMatchValidator('password', 'confirmPassword') },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.submitting.set(true);
    this.formErrors.set([]);

    const { confirmPassword: _, ...request } = this.form.getRawValue();

    this.auth.register(request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.formErrors.set(
          applyServerErrors(this.form, err, IDENTITY_CODE_MAP, REGISTER_MESSAGE_KEYS),
        );
        this.focusFirstInvalid();
      },
    });
  }
}
