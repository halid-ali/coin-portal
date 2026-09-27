import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { merge } from 'rxjs';

import {
  COIN_LIMITS,
  Coin,
  CoinUpsertRequest,
  DENOMINATIONS,
  Denomination,
  maxCoinYear,
} from '../../core/coins/coin.models';
import { CoinService } from '../../core/coins/coin.service';
import { CountryService } from '../../core/coins/country.service';
import { applyServerErrors } from '../../core/http/problem-details';
import { suggestTitle } from '../../shared/coin-format';
import { errorMessage } from '../../shared/form-errors';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';

/** Create (/collection/new) and edit (/collection/:id/edit) in one component. */
@Component({
  selector: 'app-coin-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './coin-form.html',
})
export class CoinForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly coinService = inject(CoinService);
  private readonly countryService = inject(CountryService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);

  /** Route param, bound by withComponentInputBinding(); undefined in create mode. */
  readonly id = input<string>();

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly loading = signal(false);
  protected readonly notFound = signal(false);
  protected readonly submitting = signal(false);
  protected readonly deleting = signal(false);
  protected readonly formErrors = signal<string[]>([]);

  protected readonly denominations = DENOMINATIONS;
  protected readonly countries = this.countryService.countries;
  protected readonly limits = COIN_LIMITS;
  protected readonly maxYear = maxCoinYear();
  protected readonly errorMessage = errorMessage;

  protected readonly form = this.fb.group({
    denomination: this.fb.control<Denomination | ''>('', Validators.required),
    countryCode: ['', Validators.required],
    year: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(COIN_LIMITS.minYear),
      Validators.max(this.maxYear),
    ]),
    title: ['', [Validators.required, Validators.maxLength(COIN_LIMITS.titleMaxLength)]],
    mintMark: ['', Validators.maxLength(COIN_LIMITS.mintMarkMaxLength)],
    isCommemorative: [false],
    quantity: [
      1,
      [Validators.required, Validators.min(1), Validators.max(COIN_LIMITS.maxQuantity)],
    ],
    description: ['', Validators.maxLength(COIN_LIMITS.descriptionMaxLength)],
  });

  private coinId: number | null = null;

  constructor() {
    this.countryService.load();

    // In create mode, fill the title from denomination/country/year until the user edits it
    const { denomination, countryCode, year, title } = this.form.controls;
    merge(denomination.valueChanges, countryCode.valueChanges, year.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.isEdit() || title.dirty) {
          return;
        }
        const country = countryCode.value ? this.countryService.name(countryCode.value) : null;
        title.setValue(suggestTitle(denomination.value, country, year.value));
      });
  }

  ngOnInit(): void {
    const rawId = this.id();
    if (rawId === undefined) {
      return;
    }

    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      this.notFound.set(true);
      return;
    }

    this.coinId = id;
    this.loading.set(true);
    this.coinService.get(id).subscribe({
      next: (coin) => {
        this.patchForm(coin);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          this.formErrors.set(['Coin yüklenemedi. Sayfayı yenileyip tekrar dene.']);
        }
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formErrors.set([]);

    const request = this.toRequest();
    const save$ =
      this.coinId === null
        ? this.coinService.create(request)
        : this.coinService.update(this.coinId, request);

    save$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/collection');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.formErrors.set(applyServerErrors(this.form, err));
      },
    });
  }

  protected async remove(): Promise<void> {
    if (this.coinId === null) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Coini sil',
      message: `"${this.form.controls.title.value}" koleksiyonundan kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.deleting.set(true);
    this.formErrors.set([]);

    this.coinService.delete(this.coinId).subscribe({
      next: () => this.router.navigateByUrl('/collection'),
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        // Already gone (e.g. deleted in another tab) is fine
        if (err.status === 404) {
          this.router.navigateByUrl('/collection');
          return;
        }
        this.formErrors.set(applyServerErrors(this.form, err));
      },
    });
  }

  private patchForm(coin: Coin): void {
    this.form.setValue({
      denomination: coin.denomination,
      countryCode: coin.countryCode,
      year: coin.year,
      title: coin.title,
      mintMark: coin.mintMark ?? '',
      isCommemorative: coin.isCommemorative,
      quantity: coin.quantity,
      description: coin.description ?? '',
    });
  }

  private toRequest(): CoinUpsertRequest {
    const v = this.form.getRawValue();
    return {
      title: v.title.trim(),
      description: v.description.trim() || null,
      denomination: v.denomination as Denomination,
      countryCode: v.countryCode,
      year: v.year as number,
      mintMark: v.mintMark.trim() || null,
      isCommemorative: v.isCommemorative,
      quantity: v.quantity,
    };
  }
}