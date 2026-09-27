import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../shared/form-errors';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
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

  protected readonly form = inject(NonNullableFormBuilder).group({
    userNameOrEmail: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl(this.safeReturnUrl());
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
        return 'Kullanıcı adı/e-posta veya parola hatalı.';
      case 423:
        return 'Çok fazla hatalı deneme yapıldı. Hesabın geçici olarak kilitlendi, lütfen 10 dakika sonra tekrar dene.';
      case 400:
        return 'İstek doğrulanamadı. Sayfayı yenileyip tekrar dene.';
      case 0:
        return 'Sunucuya ulaşılamıyor. Bağlantını kontrol et.';
      default:
        return 'Beklenmeyen bir hata oluştu. Lütfen tekrar dene.';
    }
  }

  /** Only allow app-internal paths to avoid open redirects. */
  private safeReturnUrl(): string {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}