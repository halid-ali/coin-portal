import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, debounceTime, of, switchMap } from 'rxjs';

import {
  ADMIN_NOTE_MAX_LENGTH,
  AdminSettings as Settings,
  AdminSettingsImpact,
  MIN_PUBLIC_COINS_RANGE,
  UNVERIFIED_LIFETIME_DAYS_RANGE,
  UNVERIFIED_MAX_COINS_RANGE,
} from '../../core/admin/admin.models';
import { AdminService } from '../../core/admin/admin.service';
import { applyServerErrors } from '../../core/http/problem-details';
import { PluralPipe } from '../../core/i18n/plural';
import { FieldA11y } from '../../shared/field-a11y';
import { errorMessage, injectFocusFirstInvalid } from '../../shared/form-errors';
import { integerValidator } from '../../shared/validators';

/**
 * Admin > General settings: site-wide values. The photographed coins a collection needs to become
 * public (before saving, how many public collections the new value leaves below it), and the coins
 * an account may hold until its e-mail address is verified and the days before it is deleted
 * without. Saved together, one audit entry each.
 */
@Component({
  selector: 'app-admin-settings',
  imports: [ReactiveFormsModule, FieldA11y, TranslocoPipe, PluralPipe],
  template: `
    @if (loadError()) {
      <p role="alert" class="alert-error">{{ 'admin.loadFailed' | transloco }}</p>
    } @else if (saved() === null) {
      <p role="status" class="text-sm text-shade-500">{{ 'common.loading' | transloco }}</p>
    } @else {
      <!-- One card per group (its icon and hue as on the overview), each setting a row: name and
       hint on the left, the value with its unit on the right (below on phones). Note and Save in
       a card of their own: they save every group at once. -->
      <form class="space-y-6" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <section class="card overflow-hidden p-0" aria-labelledby="settings-public-title">
          <div
            class="flex items-start gap-4 border-b border-shade-200 bg-shade-50 px-4 py-5 sm:px-6"
          >
            <span class="stat-icon stat-icon-emerald size-10" aria-hidden="true">
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
                <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
              </svg>
            </span>
            <div class="min-w-0">
              <h2 id="settings-public-title" class="text-lg font-semibold text-shade-900">
                {{ 'admin.settings.publicTitle' | transloco }}
              </h2>
              <p class="mt-1 text-sm text-shade-600">
                {{ 'admin.settings.publicText' | transloco }}
              </p>
            </div>
          </div>
          <div class="px-4 sm:px-6">
            <div class="grid gap-x-8 py-4 sm:grid-cols-[1fr_10rem]">
              <div>
                <label for="min-public-coins" class="block text-sm font-medium text-shade-900"
                  >{{ 'admin.settings.minPublicCoins' | transloco }}
                  <span class="sr-only"
                    >({{
                      'admin.settings.unit.coins' | plural: form.controls.minPublicCoins.value ?? 0
                    }})</span
                  ></label
                >
                <p id="min-public-coins-hint" class="form-hint">
                  {{ 'admin.settings.minPublicCoinsHint' | transloco: range }}
                </p>
              </div>
              <div class="relative mt-2 self-start sm:mt-0">
                <input
                  id="min-public-coins"
                  type="number"
                  inputmode="numeric"
                  class="form-input pr-16"
                  [min]="range.min"
                  [max]="range.max"
                  formControlName="minPublicCoins"
                  appField
                />
                <span
                  class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-shade-500"
                  aria-hidden="true"
                  >{{
                    'admin.settings.unit.coins' | plural: form.controls.minPublicCoins.value ?? 0
                  }}</span
                >
              </div>
              @if (errorMessage(form.controls.minPublicCoins); as message) {
                <p id="min-public-coins-error" class="form-error sm:col-span-2">{{ message }}</p>
              }
              <!-- What the new value means, before it is saved -->
              <p role="status" class="mt-2 text-sm text-shade-700 empty:mt-0 sm:col-span-2">
                @if (impact(); as i) {
                  {{ 'admin.settings.impact' | plural: i.publicCollectionsBelow }}
                }
              </p>
            </div>
          </div>
        </section>

        <section class="card overflow-hidden p-0" aria-labelledby="settings-unverified-title">
          <div
            class="flex items-start gap-4 border-b border-shade-200 bg-shade-50 px-4 py-5 sm:px-6"
          >
            <span class="stat-icon stat-icon-sky size-10" aria-hidden="true">
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
            <div class="min-w-0">
              <h2 id="settings-unverified-title" class="text-lg font-semibold text-shade-900">
                {{ 'admin.settings.unverifiedTitle' | transloco }}
              </h2>
              <p class="mt-1 text-sm text-shade-600">
                {{ 'admin.settings.unverifiedText' | transloco }}
              </p>
            </div>
          </div>
          <div class="divide-y divide-shade-200 px-4 sm:px-6">
            <div class="grid gap-x-8 py-4 sm:grid-cols-[1fr_10rem]">
              <div>
                <label for="unverified-max-coins" class="block text-sm font-medium text-shade-900"
                  >{{ 'admin.settings.unverifiedMaxCoins' | transloco }}
                  <span class="sr-only"
                    >({{
                      'admin.settings.unit.coins'
                        | plural: form.controls.unverifiedMaxCoins.value ?? 0
                    }})</span
                  ></label
                >
                <p id="unverified-max-coins-hint" class="form-hint">
                  {{ 'admin.settings.unverifiedMaxCoinsHint' | transloco: unverifiedRange }}
                </p>
              </div>
              <div class="relative mt-2 self-start sm:mt-0">
                <input
                  id="unverified-max-coins"
                  type="number"
                  inputmode="numeric"
                  class="form-input pr-16"
                  [min]="unverifiedRange.min"
                  [max]="unverifiedRange.max"
                  formControlName="unverifiedMaxCoins"
                  appField
                />
                <span
                  class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-shade-500"
                  aria-hidden="true"
                  >{{
                    'admin.settings.unit.coins'
                      | plural: form.controls.unverifiedMaxCoins.value ?? 0
                  }}</span
                >
              </div>
              @if (errorMessage(form.controls.unverifiedMaxCoins); as message) {
                <p id="unverified-max-coins-error" class="form-error sm:col-span-2">
                  {{ message }}
                </p>
              }
            </div>

            <div class="grid gap-x-8 py-4 sm:grid-cols-[1fr_10rem]">
              <div>
                <label
                  for="unverified-lifetime-days"
                  class="block text-sm font-medium text-shade-900"
                  >{{ 'admin.settings.unverifiedLifetimeDays' | transloco }}
                  <span class="sr-only"
                    >({{
                      'admin.settings.unit.days'
                        | plural: form.controls.unverifiedLifetimeDays.value ?? 0
                    }})</span
                  ></label
                >
                <p id="unverified-lifetime-days-hint" class="form-hint">
                  {{ 'admin.settings.unverifiedLifetimeDaysHint' | transloco: lifetimeRange }}
                </p>
              </div>
              <div class="relative mt-2 self-start sm:mt-0">
                <input
                  id="unverified-lifetime-days"
                  type="number"
                  inputmode="numeric"
                  class="form-input pr-16"
                  [min]="lifetimeRange.min"
                  [max]="lifetimeRange.max"
                  formControlName="unverifiedLifetimeDays"
                  appField
                />
                <span
                  class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-shade-500"
                  aria-hidden="true"
                  >{{
                    'admin.settings.unit.days'
                      | plural: form.controls.unverifiedLifetimeDays.value ?? 0
                  }}</span
                >
              </div>
              @if (errorMessage(form.controls.unverifiedLifetimeDays); as message) {
                <p id="unverified-lifetime-days-error" class="form-error sm:col-span-2">
                  {{ message }}
                </p>
              }
            </div>
          </div>
        </section>

        <div class="card space-y-5 px-4 py-5 sm:px-6">
          <div>
            <label for="settings-note" class="form-label">{{
              'admin.note.label' | transloco
            }}</label>
            <textarea
              id="settings-note"
              rows="2"
              class="form-input"
              [maxlength]="noteMaxLength"
              formControlName="note"
              appField
            ></textarea>
            <p id="settings-note-hint" class="form-hint">{{ 'admin.note.hint' | transloco }}</p>
          </div>

          @for (message of formErrors(); track message) {
            <p role="alert" class="alert-error">{{ message }}</p>
          }

          <div class="flex flex-wrap items-center justify-end gap-3">
            <p
              role="status"
              class="text-sm"
              [class]="outcome() === 'unchanged' ? 'text-shade-700' : 'text-success-700'"
            >
              @if (outcome() === 'saved') {
                {{ 'admin.settings.saved' | transloco }}
              } @else if (outcome() === 'unchanged') {
                {{ 'admin.settings.unchanged' | transloco }}
              }
            </p>
            <button type="submit" class="btn-primary" [attr.aria-disabled]="saving() || null">
              {{ (saving() ? 'common.saving' : 'common.save') | transloco }}
            </button>
          </div>
        </div>
      </form>
    }
  `,
})
export class AdminSettings {
  private readonly admin = inject(AdminService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly range = MIN_PUBLIC_COINS_RANGE;
  protected readonly unverifiedRange = UNVERIFIED_MAX_COINS_RANGE;
  protected readonly lifetimeRange = UNVERIFIED_LIFETIME_DAYS_RANGE;
  protected readonly noteMaxLength = ADMIN_NOTE_MAX_LENGTH;
  protected readonly errorMessage = errorMessage;
  private readonly focusFirstInvalid = injectFocusFirstInvalid();

  /** The stored values; null while loading. */
  protected readonly saved = signal<Settings | null>(null);
  protected readonly loadError = signal(false);
  protected readonly saving = signal(false);
  /**
   * After Save. "unchanged": the values are the stored ones, so nothing is sent (the API writes
   * audit entries, and with them the note, only for a change).
   */
  protected readonly outcome = signal<'saved' | 'unchanged' | null>(null);
  protected readonly formErrors = signal<string[]>([]);
  /** For a valid value other than the stored one. */
  protected readonly impact = signal<AdminSettingsImpact | null>(null);

  protected readonly form = this.fb.group({
    minPublicCoins: this.fb.control<number | null>(null, [
      Validators.required,
      integerValidator,
      Validators.min(MIN_PUBLIC_COINS_RANGE.min),
      Validators.max(MIN_PUBLIC_COINS_RANGE.max),
    ]),
    unverifiedMaxCoins: this.fb.control<number | null>(null, [
      Validators.required,
      integerValidator,
      Validators.min(UNVERIFIED_MAX_COINS_RANGE.min),
      Validators.max(UNVERIFIED_MAX_COINS_RANGE.max),
    ]),
    unverifiedLifetimeDays: this.fb.control<number | null>(null, [
      Validators.required,
      integerValidator,
      Validators.min(UNVERIFIED_LIFETIME_DAYS_RANGE.min),
      Validators.max(UNVERIFIED_LIFETIME_DAYS_RANGE.max),
    ]),
    note: ['', Validators.maxLength(ADMIN_NOTE_MAX_LENGTH)],
  });

  constructor() {
    this.admin.settings().subscribe({
      next: (settings) => this.show(settings),
      error: () => this.loadError.set(true),
    });

    const control = this.form.controls.minPublicCoins;
    control.valueChanges
      .pipe(
        debounceTime(300),
        switchMap((value) => {
          this.impact.set(null);
          return control.valid && value !== null && value !== this.saved()?.minPublicCoins
            ? this.admin.settingsImpact(value).pipe(catchError(() => of(null)))
            : of(null);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((impact) => this.impact.set(impact));
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    this.outcome.set(null);
    this.formErrors.set([]);
    const { note, ...values } = this.form.getRawValue();
    const settings = values as Settings;
    const saved = this.saved();
    if (
      settings.minPublicCoins === saved?.minPublicCoins &&
      settings.unverifiedMaxCoins === saved.unverifiedMaxCoins &&
      settings.unverifiedLifetimeDays === saved.unverifiedLifetimeDays
    ) {
      this.outcome.set('unchanged');
      return;
    }
    this.saving.set(true);
    this.admin.updateSettings(settings, note.trim()).subscribe({
      next: (stored) => {
        this.saving.set(false);
        this.show(stored);
        this.impact.set(null);
        this.outcome.set('saved');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formErrors.set(applyServerErrors(this.form, err));
        this.focusFirstInvalid();
      },
    });
  }

  private show(settings: Settings): void {
    this.saved.set(settings);
    this.form.reset({ ...settings, note: '' });
  }
}
