import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { httpErrorMessage, mapValidationProblem } from '../../core/http/problem-details';
import { errorMessage } from '../../shared/form-errors';
import {
  USER_NAME_PATTERN,
  latestBirthDate,
  minimumAgeValidator,
  passwordMatchValidator,
  passwordStrengthValidator,
} from '../../shared/validators';

const MIN_AGE = 18;

// ASP.NET Core Identity error codes -> form controls (prefix match, e.g. "PasswordRequiresDigit")
const IDENTITY_CODE_MAP: Record<string, string> = {
  DuplicateEmail: 'email',
  InvalidEmail: 'email',
  DuplicateUserName: 'userName',
  InvalidUserName: 'userName',
  Password: 'password',
};

// Identity error codes -> translation keys (the API's own messages are English)
const IDENTITY_MESSAGE_KEYS: Record<string, string> = {
  DuplicateEmail: 'register.duplicateEmail',
  DuplicateUserName: 'register.duplicateUserName',
  InvalidUserName: 'register.invalidUserName',
  InvalidEmail: 'validation.email',
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly formErrors = signal<string[]>([]);
  protected readonly errorMessage = errorMessage;
  protected readonly minAge = MIN_AGE;
  protected readonly maxBirthDate = latestBirthDate(MIN_AGE);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
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
      password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
      acceptPrivacy: [false, [Validators.requiredTrue]],
    },
    { validators: passwordMatchValidator('password', 'confirmPassword') },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
        this.applyServerErrors(err);
      },
    });
  }

  private applyServerErrors(err: HttpErrorResponse): void {
    if (err.status !== 400) {
      this.formErrors.set([httpErrorMessage(err)]);
      return;
    }

    const mapped = mapValidationProblem(
      err,
      Object.keys(this.form.controls),
      IDENTITY_CODE_MAP,
      IDENTITY_MESSAGE_KEYS,
    );

    for (const [name, message] of Object.entries(mapped.fields)) {
      const control = this.form.get(name);
      control?.setErrors({ ...control.errors, server: message });
      control?.markAsTouched();
    }

    const general = mapped.general;
    if (!general.length && !Object.keys(mapped.fields).length) {
      // A 400 without a problem body usually means the antiforgery check failed
      general.push(translate('errors.requestRejected'));
    }
    this.formErrors.set(general);
  }
}
