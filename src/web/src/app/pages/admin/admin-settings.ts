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
      <form class="card max-w-2xl space-y-5" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div>
          <h2 class="text-lg font-semibold text-shade-900">
            {{ 'admin.settings.publicTitle' | transloco }}
          </h2>
          <p class="mt-1 text-sm text-shade-600">{{ 'admin.settings.publicText' | transloco }}</p>
        </div>

        <div>
          <label for="min-public-coins" class="form-label">{{
            'admin.settings.minPublicCoins' | transloco
          }}</label>
          <input
            id="min-public-coins"
            type="number"
            inputmode="numeric"
            class="form-input w-32"
            [min]="range.min"
            [max]="range.max"
            formControlName="minPublicCoins"
            appField
          />
          @if (errorMessage(form.controls.minPublicCoins); as message) {
            <p id="min-public-coins-error" class="form-error">{{ message }}</p>
          }
          <p id="min-public-coins-hint" class="form-hint">
            {{ 'admin.settings.minPublicCoinsHint' | transloco: range }}
          </p>
          <!-- What the new value means, before it is saved -->
          <p role="status" class="mt-2 text-sm text-shade-700">
            @if (impact(); as i) {
              {{ 'admin.settings.impact' | plural: i.publicCollectionsBelow }}
            }
          </p>
        </div>

        <div class="border-t border-shade-200 pt-5">
          <h2 class="text-lg font-semibold text-shade-900">
            {{ 'admin.settings.unverifiedTitle' | transloco }}
          </h2>
          <p class="mt-1 text-sm text-shade-600">
            {{ 'admin.settings.unverifiedText' | transloco }}
          </p>
        </div>

        <div>
          <label for="unverified-max-coins" class="form-label">{{
            'admin.settings.unverifiedMaxCoins' | transloco
          }}</label>
          <input
            id="unverified-max-coins"
            type="number"
            inputmode="numeric"
            class="form-input w-32"
            [min]="unverifiedRange.min"
            [max]="unverifiedRange.max"
            formControlName="unverifiedMaxCoins"
            appField
          />
          @if (errorMessage(form.controls.unverifiedMaxCoins); as message) {
            <p id="unverified-max-coins-error" class="form-error">{{ message }}</p>
          }
          <p id="unverified-max-coins-hint" class="form-hint">
            {{ 'admin.settings.unverifiedMaxCoinsHint' | transloco: unverifiedRange }}
          </p>
        </div>

        <div>
          <label for="unverified-lifetime-days" class="form-label">{{
            'admin.settings.unverifiedLifetimeDays' | transloco
          }}</label>
          <input
            id="unverified-lifetime-days"
            type="number"
            inputmode="numeric"
            class="form-input w-32"
            [min]="lifetimeRange.min"
            [max]="lifetimeRange.max"
            formControlName="unverifiedLifetimeDays"
            appField
          />
          @if (errorMessage(form.controls.unverifiedLifetimeDays); as message) {
            <p id="unverified-lifetime-days-error" class="form-error">{{ message }}</p>
          }
          <p id="unverified-lifetime-days-hint" class="form-hint">
            {{ 'admin.settings.unverifiedLifetimeDaysHint' | transloco: lifetimeRange }}
          </p>
        </div>

        <div>
          <label for="settings-note" class="form-label">{{ 'admin.note.label' | transloco }}</label>
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

        <div class="flex flex-wrap items-center gap-3">
          <button type="submit" class="btn-primary" [attr.aria-disabled]="saving() || null">
            {{ (saving() ? 'common.saving' : 'common.save') | transloco }}
          </button>
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
