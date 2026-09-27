import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { mapValidationProblem } from '../../core/http/problem-details';
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

const IDENTITY_MESSAGES: Record<string, string> = {
  DuplicateEmail: 'Bu e-posta adresiyle zaten bir hesap var.',
  DuplicateUserName: 'Bu kullanıcı adı alınmış.',
  InvalidUserName: 'Kullanıcı adında sadece harf, rakam ve . _ - kullanılabilir.',
  InvalidEmail: 'Geçerli bir e-posta adresi girin.',
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly formErrors = signal<string[]>([]);
  protected readonly errorMessage = errorMessage;
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
          Validators.maxLength(30),
          Validators.pattern(USER_NAME_PATTERN),
        ],
      ],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      birthDate: ['', [Validators.required, minimumAgeValidator(MIN_AGE)]],
      password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
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
      this.formErrors.set([
        err.status === 0
          ? 'Sunucuya ulaşılamıyor. Bağlantını kontrol et.'
          : 'Beklenmeyen bir hata oluştu. Lütfen tekrar dene.',
      ]);
      return;
    }

    const mapped = mapValidationProblem(
      err,
      Object.keys(this.form.controls),
      IDENTITY_CODE_MAP,
      IDENTITY_MESSAGES,
    );

    for (const [name, message] of Object.entries(mapped.fields)) {
      const control = this.form.get(name);
      control?.setErrors({ ...control.errors, server: message });
      control?.markAsTouched();
    }

    const general = mapped.general;
    if (!general.length && !Object.keys(mapped.fields).length) {
      // A 400 without a problem body usually means the antiforgery check failed
      general.push('İstek doğrulanamadı. Sayfayı yenileyip tekrar dene.');
    }
    this.formErrors.set(general);
  }
}