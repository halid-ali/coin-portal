import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { MessageKey, applyServerErrors } from '../../core/http/problem-details';
import { LanguageService } from '../../core/i18n/language.service';
import { FieldA11y } from '../../shared/field-a11y';
import { PasswordField } from '../../shared/password-field/password-field';
import { errorMessage, injectFocusFirstInvalid } from '../../shared/form-errors';
import { passwordMatchValidator, passwordStrengthValidator } from '../../shared/validators';

// ChangePasswordRequest in the API
const MAX_PASSWORD_LENGTH = 100;

// Identity's error codes -> fields; the exact code first, then the prefix ("PasswordRequiresDigit")
const IDENTITY_CODE_MAP: Record<string, string> = {
  PasswordMismatch: 'currentPassword',
  Password: 'newPassword',
};

// Like the sign-up's: the form checks the same rules first, except the current password
const MESSAGE_KEYS: Record<string, MessageKey> = {
  PasswordMismatch: 'settings.security.password.wrongCurrent',
  PasswordTooShort: { key: 'validation.minLength', params: { min: 8 } },
  PasswordRequiresDigit: 'validation.passwordStrength',
  PasswordRequiresLower: 'validation.passwordStrength',
  PasswordRequiresUpper: 'validation.passwordStrength',
  CurrentPassword: 'validation.required',
  NewPassword: { key: 'validation.maxLength', params: { max: MAX_PASSWORD_LENGTH } },
};

/**
 * Settings > Security: changing the password (the other sessions end, this one stays; the API
 * tells the owner by e-mail) and the previous sign-in, to spot one that was not the user's.
 */
@Component({
  selector: 'app-security-settings',
  imports: [ReactiveFormsModule, FieldA11y, PasswordField, TranslocoPipe],
  template: `
    <div class="space-y-6">
      <section class="card" aria-labelledby="password-title">
        <h2 id="password-title" class="text-lg font-semibold text-shade-900">
          {{ 'settings.security.password.title' | transloco }}
        </h2>
        <p class="mt-1 text-sm text-shade-600">
          {{ 'settings.security.password.description' | transloco }}
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="mt-5 space-y-5">
          @if (formErrors().length) {
            <div role="alert" class="alert-error">
              @for (message of formErrors(); track $index) {
                <p>{{ message }}</p>
              }
            </div>
          }
          <!-- Stays in place while the user types again; announced once -->
          @if (changed()) {
            <p role="status" class="alert-success">
              {{ 'settings.security.password.done' | transloco }}
            </p>
          }

          <!-- For password managers: the account the passwords belong to -->
          <input
            type="text"
            class="hidden"
            autocomplete="username"
            [value]="auth.currentUser()?.userName ?? ''"
            readonly
          />

          <div class="max-w-md space-y-5">
            <div>
              <label for="currentPassword" class="form-label">{{
                'settings.security.password.current' | transloco
              }}</label>
              <app-password-field>
                <input
                  id="currentPassword"
                  type="password"
                  formControlName="currentPassword"
                  appField
                  autocomplete="current-password"
                  class="form-input"
                />
              </app-password-field>
              @if (errorMessage(form.controls.currentPassword); as msg) {
                <p id="currentPassword-error" class="form-error">{{ msg }}</p>
              }
            </div>

            <div>
              <label for="newPassword" class="form-label">{{
                'settings.security.password.new' | transloco
              }}</label>
              <app-password-field>
                <input
                  id="newPassword"
                  type="password"
                  formControlName="newPassword"
                  appField
                  autocomplete="new-password"
                  class="form-input"
                />
              </app-password-field>
              @if (errorMessage(form.controls.newPassword); as msg) {
                <p id="newPassword-error" class="form-error">{{ msg }}</p>
              } @else {
                <p id="newPassword-hint" class="form-hint">
                  {{ 'register.passwordHint' | transloco }}
                </p>
              }
            </div>

            <div>
              <label for="confirmPassword" class="form-label">{{
                'settings.security.password.confirm' | transloco
              }}</label>
              <app-password-field>
                <input
                  id="confirmPassword"
                  type="password"
                  formControlName="confirmPassword"
                  appField
                  autocomplete="new-password"
                  class="form-input"
                />
              </app-password-field>
              @if (errorMessage(form.controls.confirmPassword); as msg) {
                <p id="confirmPassword-error" class="form-error">{{ msg }}</p>
              }
            </div>
          </div>

          <div>
            <button type="submit" class="btn-primary" [attr.aria-disabled]="submitting() || null">
              {{
                (submitting()
                  ? 'settings.security.password.submitting'
                  : 'settings.security.password.submit'
                ) | transloco
              }}
            </button>
          </div>
        </form>
      </section>

      <section class="card" aria-labelledby="previous-sign-in-title">
        <h2 id="previous-sign-in-title" class="text-lg font-semibold text-shade-900">
          {{ 'settings.security.previousSignIn.title' | transloco }}
        </h2>
        <p class="mt-1 text-sm text-shade-600">
          {{ 'settings.security.previousSignIn.description' | transloco }}
        </p>
        @if (previousSignIn(); as previous) {
          <p class="mt-4 font-medium text-shade-900">{{ previous }}</p>
        } @else {
          <p class="mt-4 text-shade-500">
            {{ 'settings.security.previousSignIn.none' | transloco }}
          </p>
        }
      </section>
    </div>
  `,
})
export class SecuritySettings {
  protected readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);

  protected readonly submitting = signal(false);
  protected readonly changed = signal(false);
  protected readonly formErrors = signal<string[]>([]);
  protected readonly errorMessage = errorMessage;
  private readonly focusFirstInvalid = injectFocusFirstInvalid();

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      currentPassword: ['', [Validators.required]],
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

  /** Date and time in the UI language and the device's time zone; null when none is recorded. */
  protected readonly previousSignIn = computed(() => {
    const iso = this.auth.currentUser()?.previousSignInAtUtc;
    if (!iso) {
      return null;
    }
    return new Intl.DateTimeFormat(this.language.current(), {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(iso));
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
    this.changed.set(false);
    this.formErrors.set([]);
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        // Nothing to keep: the passwords are not left in the form
        this.form.reset();
        this.changed.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.formErrors.set(applyServerErrors(this.form, err, IDENTITY_CODE_MAP, MESSAGE_KEYS));
        this.focusFirstInvalid();
      },
    });
  }
}
