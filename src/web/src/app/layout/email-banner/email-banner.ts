import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { httpErrorKey, problemCode } from '../../core/http/problem-details';
import { LanguageService } from '../../core/i18n/language.service';
import { PluralPipe } from '../../core/i18n/plural';

/** Stands for the date in the deletion sentence, which is cut there to set the date in bold. */
const DATE_MARK = '⁣';

/**
 * Above every page while the signed-in user's e-mail address is not verified: sharing
 * collections, opening another one and more coins than the limit (unverifiedMaxCoins) need it,
 * and when the account is deleted without it. Sends the link again; the link itself opens
 * /verify-email. Layout (user's choice, 2026-10-07): the address with the resend button, the
 * deletion date, both with an icon in one column, then what waits for the address. The resend
 * action is a button on every width (the envelope is centered on its row from sm up).
 */
@Component({
  selector: 'app-email-banner',
  imports: [TranslocoPipe, PluralPipe],
  host: { class: 'block' },
  template: `
    @if (user(); as user) {
      <section
        class="mb-6 grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl border border-info-200 bg-info-50 px-4 py-3 text-sm text-info-800 sm:px-5 sm:py-4"
        [attr.aria-label]="'emailBanner.label' | transloco"
      >
        <span class="flex h-6 items-center sm:h-9" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
            <path d="m3.5 7 8.5 6 8.5-6" />
          </svg>
        </span>
        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p class="text-base leading-6 font-semibold wrap-break-word">
            {{ 'emailBanner.title' | transloco: { email: user.email } }}
          </p>
          <button
            type="button"
            class="btn-secondary px-3.5 py-1.5 text-sm whitespace-nowrap"
            [attr.aria-disabled]="sending() || null"
            (click)="resend()"
          >
            {{ 'emailBanner.resend' | transloco }}
          </button>
        </div>

        @if (deletionDate(); as date) {
          <span class="flex h-5 items-center" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              class="size-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          @let sentence = ('emailBanner.deletion' | transloco: { date: dateMark }).split(dateMark);
          <p class="leading-5 font-medium">
            {{ sentence[0] }}<strong class="font-bold">{{ date }}</strong
            >{{ sentence[1] }}
          </p>
        }

        <div class="col-start-2 text-[0.8125rem] text-info-700">
          <p class="mt-1">{{ 'emailBanner.until' | transloco }}</p>
          <ul class="mt-1 flex flex-wrap gap-x-5 gap-y-1">
            <li>
              <span aria-hidden="true">• </span>{{ 'emailBanner.noNewCollection' | transloco }}
            </li>
            <li><span aria-hidden="true">• </span>{{ 'emailBanner.noSharing' | transloco }}</li>
            <li>
              <span aria-hidden="true">• </span
              >{{ 'emailBanner.maxCoins' | plural: user.unverifiedMaxCoins ?? 0 }}
            </li>
          </ul>
        </div>

        <div class="col-start-2" role="status">
          @if (sent()) {
            <p>{{ 'emailBanner.sent' | transloco: { email: user.email } }}</p>
          }
        </div>
        @if (error(); as error) {
          <p role="alert" class="col-start-2 font-medium text-danger-700">
            {{ error | transloco }}
          </p>
        }
      </section>
    }
  `,
})
export class EmailBanner {
  private readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);

  protected readonly dateMark = DATE_MARK;

  /** The user while the address is unverified, otherwise null (no banner). */
  protected readonly user = computed(() => {
    const user = this.auth.currentUser();
    return user && !user.emailConfirmed ? user : null;
  });
  /** The day the account is deleted unless verified, in the UI language; UTC like the e-mail's. */
  protected readonly deletionDate = computed(() => {
    const due = this.user()?.unverifiedDeletionDueUtc;
    return due
      ? new Intl.DateTimeFormat(this.language.current(), {
          dateStyle: 'long',
          timeZone: 'UTC',
        }).format(new Date(due))
      : null;
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
