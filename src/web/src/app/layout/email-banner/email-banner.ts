import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { httpErrorKey, problemCode } from '../../core/http/problem-details';
import { PluralPipe } from '../../core/i18n/plural';

/**
 * Above every page while the signed-in user's e-mail address is not verified: sharing
 * collections, opening another one and more coins than the limit (unverifiedMaxCoins) need it.
 * Sends the link again; the link itself opens /verify-email.
 */
@Component({
  selector: 'app-email-banner',
  imports: [TranslocoPipe, PluralPipe],
  host: { class: 'block' },
  template: `
    @if (user(); as user) {
      <section
        class="mb-6 rounded-lg border border-info-200 bg-info-50 px-4 py-3 text-sm text-info-800"
        [attr.aria-label]="'emailBanner.label' | transloco"
      >
        <p>
          {{ 'emailBanner.text' | plural: user.unverifiedMaxCoins ?? 0 : { email: user.email } }}
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            class="link font-medium whitespace-nowrap"
            [attr.aria-disabled]="sending() || null"
            (click)="resend()"
          >
            {{ 'emailBanner.resend' | transloco }}
          </button>
          <span role="status">
            @if (sent()) {
              {{ 'emailBanner.sent' | transloco: { email: user.email } }}
            }
          </span>
        </div>
        @if (error(); as error) {
          <p role="alert" class="mt-2 font-medium text-danger-700">{{ error | transloco }}</p>
        }
      </section>
    }
  `,
})
export class EmailBanner {
  private readonly auth = inject(AuthService);

  /** The user while the address is unverified, otherwise null (no banner). */
  protected readonly user = computed(() => {
    const user = this.auth.currentUser();
    return user && !user.emailConfirmed ? user : null;
  });
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  /** Translation key of the last failure. */
  protected readonly error = signal<string | null>(null);

  protected resend(): void {
    if (this.sending()) {
      return;
    }
    this.sending.set(true);
    this.sent.set(false);
    this.error.set(null);
    this.auth.resendVerificationEmail().subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.error.set(
          problemCode(err) === 'email_not_sent' ? 'emailBanner.notSent' : httpErrorKey(err),
        );
      },
    });
  }
}
