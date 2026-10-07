import { Component, DestroyRef, inject, signal } from '@angular/core';
import { TranslocoPipe, translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { formatRelative } from '../../core/admin/admin-format';
import { ADMIN_NOTE_MAX_LENGTH, AdminVerificationRequests } from '../../core/admin/admin.models';
import { AdminService } from '../../core/admin/admin.service';
import { LanguageService } from '../../core/i18n/language.service';
import { PluralPipe, plural } from '../../core/i18n/plural';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';

/** How often a running send is asked for its progress. */
export const VERIFICATION_POLL_MS = 2000;

/**
 * Admin > Overview: the one-time request to verify the e-mail address, for the accounts from
 * before verification existed (user decision 2026-10-07). How many accounts are left, the start
 * (confirmed, with a note for the audit log) and the progress of the run, asked for every few
 * seconds while it sends in the background.
 */
@Component({
  selector: 'app-admin-verification-requests',
  imports: [TranslocoPipe, PluralPipe],
  host: { class: 'block' },
  template: `
    @if (state(); as s) {
      <section class="card p-5 sm:px-6" aria-labelledby="verification-requests-title">
        <h2 id="verification-requests-title" class="font-semibold text-shade-900">
          {{ 'admin.verification.title' | transloco }}
        </h2>
        <p class="mt-1 text-sm text-shade-600">{{ 'admin.verification.text' | transloco }}</p>
        <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            class="btn-primary whitespace-nowrap"
            [attr.aria-disabled]="!canStart() || null"
            (click)="start()"
          >
            {{ 'admin.verification.start' | plural: s.pending }}
          </button>
          <p role="status" class="text-sm text-shade-700">
            @if (s.lastRun; as run) {
              @if (run.finishedAtUtc) {
                {{
                  'admin.verification.finished'
                    | transloco
                      : { time: relative(run.finishedAtUtc), sent: run.sent, failed: run.failed }
                }}
              } @else {
                {{
                  'admin.verification.running'
                    | transloco: { done: run.sent + run.failed, total: run.total }
                }}
              }
            } @else if (s.pending === 0) {
              {{ 'admin.verification.nothing' | transloco }}
            }
          </p>
        </div>
        @if (error()) {
          <p role="alert" class="alert-error mt-3">{{ 'admin.verification.failed' | transloco }}</p>
        }
      </section>
    }
  `,
})
export class AdminVerificationRequestsPanel {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly language = inject(LanguageService);

  protected readonly state = signal<AdminVerificationRequests | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal(false);
  private poll: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.poll));
    this.load();
  }

  protected canStart(): boolean {
    const s = this.state();
    return !!s && s.pending > 0 && !this.busy() && !this.isRunning(s);
  }

  protected async start(): Promise<void> {
    const s = this.state();
    if (!s || !this.canStart()) {
      return;
    }
    const note = await this.confirm.confirmWithNote({
      title: translate('admin.verification.confirmTitle'),
      message: plural('admin.verification.confirmMessage', s.pending, this.language.current()),
      confirmText: translate('admin.verification.send'),
      note: {
        label: translate('admin.note.label'),
        hint: translate('admin.note.hint'),
        maxLength: ADMIN_NOTE_MAX_LENGTH,
      },
    });
    if (note === null) {
      return;
    }
    this.busy.set(true);
    this.error.set(false);
    try {
      this.show(await firstValueFrom(this.admin.startVerificationRequests(note)));
    } catch {
      // A run started elsewhere (409) or a failure: the current state tells
      this.error.set(true);
      this.load();
    } finally {
      this.busy.set(false);
    }
  }

  protected relative(iso: string): string {
    return formatRelative(iso, this.language.current());
  }

  private load(): void {
    this.admin.verificationRequests().subscribe({
      next: (state) => this.show(state),
      error: () => this.error.set(true),
    });
  }

  /** Shows the state; while a run goes, asks again a little later. */
  private show(state: AdminVerificationRequests): void {
    this.state.set(state);
    clearTimeout(this.poll);
    if (this.isRunning(state)) {
      this.poll = setTimeout(() => this.load(), VERIFICATION_POLL_MS);
    }
  }

  private isRunning(state: AdminVerificationRequests): boolean {
    return !!state.lastRun && !state.lastRun.finishedAtUtc;
  }
}
