import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { ACCOUNT_DELETED_STATE, ACCOUNT_EXPORT_URL } from '../../core/settings/settings.service';
import { DeleteAccountDialog } from './delete-account-dialog';

/**
 * Settings > Account: download one's data (a ZIP) and delete the account. Admins cannot delete
 * theirs here; they are removed from the configuration first (like they cannot be locked).
 */
@Component({
  selector: 'app-account-settings',
  imports: [TranslocoPipe, DeleteAccountDialog],
  template: `
    <div class="space-y-6">
      <div class="card space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-shade-900">
            {{ 'settings.account.export.title' | transloco }}
          </h2>
          <p class="mt-1 text-sm text-shade-600">
            {{ 'settings.account.export.description' | transloco }}
          </p>
        </div>
        <div>
          <a [href]="exportUrl" download class="btn-secondary gap-2">
            <svg
              viewBox="0 0 24 24"
              class="size-4.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />
            </svg>
            {{ 'settings.account.export.button' | transloco }}
          </a>
          <p class="form-hint">{{ 'settings.account.export.hint' | transloco }}</p>
        </div>
      </div>

      <div class="card space-y-4 border-danger-200">
        <div>
          <h2 class="text-lg font-semibold text-danger-700">
            {{ 'settings.account.delete.title' | transloco }}
          </h2>
          <p class="mt-1 text-sm text-shade-600">
            {{ 'settings.account.delete.description' | transloco }}
          </p>
        </div>
        @if (isAdmin()) {
          <p class="text-sm text-shade-500">
            {{ 'settings.account.delete.adminNote' | transloco }}
          </p>
        } @else {
          <div>
            <button type="button" class="btn-danger" (click)="dialogOpen.set(true)">
              {{ 'settings.account.delete.button' | transloco }}
            </button>
          </div>
        }
      </div>
    </div>

    @if (dialogOpen()) {
      <app-delete-account-dialog (closed)="onDialogClosed($event)" />
    }
  `,
})
export class AccountSettings {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly exportUrl = ACCOUNT_EXPORT_URL;
  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly dialogOpen = signal(false);

  protected onDialogClosed(deleted: boolean): void {
    this.dialogOpen.set(false);
    if (deleted) {
      this.router.navigate(['/'], { state: ACCOUNT_DELETED_STATE });
    }
  }
}
