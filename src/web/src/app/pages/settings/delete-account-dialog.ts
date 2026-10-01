import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { httpErrorMessage } from '../../core/http/problem-details';
import { ACCOUNT_EXPORT_URL, SettingsService } from '../../core/settings/settings.service';

let nextId = 0;

/**
 * Deleting one's own account: asks for the password and says plainly that it cannot be undone.
 * Its own dialog (not ConfirmDialog): a wrong password keeps it open with the message. Emits true
 * once the account is gone (the user is signed out by then), false when cancelled.
 */
@Component({
  selector: 'app-delete-account-dialog',
  imports: [TranslocoPipe],
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="dialog-panel max-w-md"
      (cancel)="busy() && $event.preventDefault()"
      (close)="onClose()"
    >
      <form class="space-y-4 p-6" (submit)="$event.preventDefault(); remove()">
        <div class="flex items-start gap-4">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-100 text-danger-600"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="size-5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
              />
            </svg>
          </div>
          <div>
            <h2 [id]="titleId" class="text-lg font-semibold text-shade-900">
              {{ 'settings.account.delete.dialogTitle' | transloco }}
            </h2>
            <p class="mt-2 text-sm text-shade-600">
              {{ 'settings.account.delete.dialogMessage' | transloco }}
            </p>
          </div>
        </div>

        <p class="text-sm text-shade-600">
          {{ 'settings.account.delete.exportFirst' | transloco }}
          <a [href]="exportUrl" download class="link">{{
            'settings.account.export.button' | transloco
          }}</a>
        </p>

        <div>
          <label [for]="titleId + '-password'" class="form-label">{{
            'settings.account.delete.password' | transloco
          }}</label>
          <input
            [id]="titleId + '-password'"
            type="password"
            class="form-input"
            autocomplete="current-password"
            autofocus
            [value]="password()"
            (input)="password.set($any($event.target).value); error.set(null)"
          />
        </div>

        @if (error()) {
          <p role="alert" class="alert-error">{{ error() }}</p>
        }

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" class="btn-secondary" [disabled]="busy()" (click)="close()">
            {{ 'common.cancel' | transloco }}
          </button>
          <button type="submit" class="btn-danger" [disabled]="!password() || busy()">
            {{
              (busy() ? 'settings.account.delete.deleting' : 'settings.account.delete.confirm')
                | transloco
            }}
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class DeleteAccountDialog {
  private readonly settings = inject(SettingsService);

  readonly closed = output<boolean>();

  protected readonly titleId = `delete-account-${++nextId}`;
  protected readonly exportUrl = ACCOUNT_EXPORT_URL;
  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private deleted = false;

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected remove(): void {
    if (!this.password() || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.settings.deleteAccount(this.password()).subscribe({
      next: () => {
        this.deleted = true;
        this.busy.set(false);
        this.dialog().nativeElement.close();
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.password.set('');
        this.error.set(this.describe(err));
      },
    });
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  // Single exit point: buttons and Escape both end up here
  protected onClose(): void {
    this.closed.emit(this.deleted);
  }

  private describe(err: HttpErrorResponse): string {
    const code = (err.error as { code?: string } | null)?.code;
    if (code === 'wrong_password') {
      return translate('settings.account.delete.wrongPassword');
    }
    if (code === 'admin_account') {
      return translate('settings.account.delete.adminNote');
    }
    return err.status === 423 ? translate('login.lockedOut') : httpErrorMessage(err);
  }
}
