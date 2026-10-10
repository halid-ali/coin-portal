import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { httpErrorKey } from '../../core/http/problem-details';
import { formatBytes } from '../../core/i18n/format-bytes';
import { LanguageService } from '../../core/i18n/language.service';
import {
  ACCOUNT_DELETED_STATE,
  PhotoStorage,
  SettingsService,
} from '../../core/settings/settings.service';
import { delayedLoading } from '../../shared/skeleton';
import { DeleteAccountDialog } from './delete-account-dialog';
import { ExportDownload } from './export-download';

/**
 * The bar's colors by how full the storage is (user choice 2026-10-10): green, orange from 75 %, red
 * from 90 % with the "nearly full" note. The same shares send the warning e-mails (API
 * Photos/StorageWarnings).
 */
const FILLING = 0.75;
const NEARLY_FULL = 0.9;

/**
 * Settings > Account: the photo storage (how much is used of the limit every user has), download
 * one's data (a ZIP) and delete the account. Admins cannot delete
 * theirs here; they are removed from the configuration first (like they cannot be locked).
 */
@Component({
  selector: 'app-account-settings',
  imports: [TranslocoPipe, DeleteAccountDialog, ExportDownload],
  template: `
    <div class="space-y-6">
      <section class="card" aria-labelledby="storage-title">
        <h2 id="storage-title" class="text-lg font-semibold text-shade-900">
          {{ 'settings.account.storage.title' | transloco }}
        </h2>
        <p class="mt-1 text-sm text-shade-600">
          {{ 'settings.account.storage.description' | transloco }}
        </p>
        @if (storage(); as s) {
          <div
            role="meter"
            class="usage-bar mt-4"
            aria-labelledby="storage-title"
            aria-valuemin="0"
            [attr.aria-valuemax]="s.quotaBytes"
            [attr.aria-valuenow]="clampedUsed()"
            [attr.aria-valuetext]="
              'settings.account.storage.used'
                | transloco: { used: bytes(s.usedBytes), quota: bytes(s.quotaBytes) }
            "
          >
            <span
              class="usage-bar-fill"
              [class.usage-bar-fill-warn]="level() === 'filling'"
              [class.usage-bar-fill-full]="level() === 'nearlyFull' || level() === 'full'"
              [style.width.%]="percent()"
            ></span>
          </div>
          <div
            class="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 text-sm"
            aria-hidden="true"
          >
            <span class="text-shade-800">{{
              'settings.account.storage.used'
                | transloco: { used: bytes(s.usedBytes), quota: bytes(s.quotaBytes) }
            }}</span>
            <span class="text-shade-600">{{
              'settings.account.storage.left' | transloco: { left: bytes(left()) }
            }}</span>
          </div>
          @if (level() === 'nearlyFull') {
            <p class="mt-3 text-sm text-shade-700">
              {{ 'settings.account.storage.nearlyFull' | transloco }}
            </p>
          } @else if (level() === 'full') {
            <p class="mt-3 text-sm font-medium text-danger-700">
              {{ 'settings.account.storage.full' | transloco }}
            </p>
          }
        } @else if (storageError(); as key) {
          <p role="alert" class="form-error">{{ key | transloco }}</p>
        } @else {
          <!-- The bar and the numbers as shapes after a moment (user choice 2026-10-10) -->
          <p role="status" class="sr-only">{{ 'common.loading' | transloco }}</p>
          @if (showSkeleton()) {
            <div aria-hidden="true">
              <div class="skeleton mt-4 h-2.5 rounded-full"></div>
              <div class="mt-2 flex h-5 items-center justify-between gap-4">
                <div class="skeleton h-3 w-40 rounded-full"></div>
                <div class="skeleton h-3 w-24 rounded-full"></div>
              </div>
            </div>
          }
        }
      </section>

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
          <a appExportDownload #exportLink="appExportDownload" class="btn-secondary gap-2">
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
          @if (exportLink.error(); as key) {
            <p role="alert" class="form-error">{{ key | transloco }}</p>
          }
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
            <button type="button" class="btn-secondary-danger" (click)="dialogOpen.set(true)">
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
  private readonly language = inject(LanguageService);

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly dialogOpen = signal(false);

  protected readonly storage = signal<PhotoStorage | null>(null);
  /** Translation key when the storage could not be read. */
  protected readonly storageError = signal<string | null>(null);
  protected readonly showSkeleton = delayedLoading(
    computed(() => this.storage() === null && this.storageError() === null),
  );
  /** Used may be above the limit (lowered by an admin): the bar stops at full. */
  protected readonly clampedUsed = computed(() => {
    const s = this.storage();
    return s ? Math.min(s.usedBytes, s.quotaBytes) : 0;
  });
  /** Some use shows at least a sliver: a few photos are a tiny share of the limit. */
  protected readonly percent = computed(() => {
    const quota = this.storage()?.quotaBytes ?? 0;
    const used = this.clampedUsed();
    return quota > 0 && used > 0 ? Math.max(1, (used / quota) * 100) : 0;
  });
  protected readonly left = computed(() => {
    const s = this.storage();
    return s ? Math.max(0, s.quotaBytes - s.usedBytes) : 0;
  });
  protected readonly level = computed<'normal' | 'filling' | 'nearlyFull' | 'full'>(() => {
    const s = this.storage();
    if (!s || s.usedBytes < s.quotaBytes * FILLING) {
      return 'normal';
    }
    if (s.usedBytes < s.quotaBytes * NEARLY_FULL) {
      return 'filling';
    }
    return s.usedBytes >= s.quotaBytes ? 'full' : 'nearlyFull';
  });

  constructor() {
    inject(SettingsService)
      .storage()
      .subscribe({
        next: (storage) => this.storage.set(storage),
        error: (err: HttpErrorResponse) => this.storageError.set(httpErrorKey(err)),
      });
  }

  protected bytes(value: number): string {
    return formatBytes(value, this.language.current());
  }

  protected onDialogClosed(deleted: boolean): void {
    this.dialogOpen.set(false);
    if (deleted) {
      this.router.navigate(['/'], { state: ACCOUNT_DELETED_STATE });
    }
  }
}
