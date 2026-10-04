import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { Component, OnInit, WritableSignal, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, UrlTree } from '@angular/router';
import { TranslocoPipe, translate } from '@jsverse/transloco';
import { firstValueFrom, merge } from 'rxjs';

import {
  COIN_LIMITS,
  COIN_SIDES,
  Coin,
  CoinPhoto,
  CoinSide,
  CoinUpsertRequest,
  DENOMINATIONS,
  Denomination,
  maxCoinYear,
} from '../../core/coins/coin.models';
import { CoinService } from '../../core/coins/coin.service';
import { CollectionReturn } from '../../core/coins/collection-return';
import { CountryService } from '../../core/coins/country.service';
import { Collection } from '../../core/collections/collection.models';
import { CollectionService } from '../../core/collections/collection.service';
import { photoErrorMessage } from '../../core/coins/photo-errors';
import { applyServerErrors } from '../../core/http/problem-details';
import { denominationLabel, suggestTitle } from '../../shared/coin-format';
import { errorMessage, injectFocusFirstInvalid } from '../../shared/form-errors';
import { FieldA11y } from '../../shared/field-a11y';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { PhotoViewer } from '../../shared/photo-viewer/photo-viewer';
import { ImageChange } from '../../shared/image-change';
import { DISCARD_CHANGES_STATE, HasUnsavedChanges } from '../../shared/unsaved-changes';
import { PhotoSlot } from './photo-slot';

/** Create (/coins/new?collection=<id>) and edit (/coins/:id/edit) in one component. */
@Component({
  selector: 'app-coin-form',
  imports: [ReactiveFormsModule, FieldA11y, RouterLink, TranslocoPipe, PhotoSlot, PhotoViewer],
  templateUrl: './coin-form.html',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class CoinForm implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly coinService = inject(CoinService);
  private readonly countryService = inject(CountryService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly location = inject(Location);
  private readonly collectionService = inject(CollectionService);
  private readonly collectionReturn = inject(CollectionReturn);

  /** Route param, bound by withComponentInputBinding(); undefined in create mode. */
  readonly id = input<string>();
  /** Query param in create mode: the collection the form was opened from. */
  readonly collection = input<string>();

  /** The user's collections for the select; null while loading. */
  protected readonly collections = signal<Collection[] | null>(null);
  /** The collections could not be loaded (not the same as having none). */
  protected readonly collectionsError = signal(false);

  /**
   * Every way back to the list: the exact collection page the user came from, otherwise the
   * coin's (or the preselected) collection.
   */
  protected readonly returnTree = computed<UrlTree>(() => {
    const url = this.collectionReturn.url();
    if (url) {
      return this.router.parseUrl(url);
    }
    const collectionId = this.coin()?.collectionId ?? (Number(this.collection()) || null);
    return this.router.createUrlTree(
      collectionId ? ['/collections', collectionId] : ['/collections'],
    );
  });

  /** Id of the saved coin: set on load in edit mode and after the first save in create mode. */
  private readonly coinId = signal<number | null>(null);
  protected readonly isEdit = computed(() => this.id() !== undefined || this.coinId() !== null);
  /** The saved coin as last returned by the API (photos included). */
  protected readonly coin = signal<Coin | null>(null);
  protected readonly loading = signal(false);
  protected readonly notFound = signal(false);
  protected readonly submitting = signal(false);
  protected readonly deleting = signal(false);
  protected readonly formErrors = signal<string[]>([]);

  /** The saved coin's collection is hidden by an admin: its coins stay in it (API 403). */
  protected readonly moveLocked = computed(() => {
    const collectionId = this.coin()?.collectionId;
    return !!this.collections()?.find((c) => c.id === collectionId)?.moderationLocked;
  });

  protected readonly denominations = DENOMINATIONS;
  protected readonly denominationLabel = denominationLabel;
  protected readonly countries = this.countryService.countries;
  protected readonly limits = COIN_LIMITS;
  protected readonly maxYear = maxCoinYear();
  protected readonly errorMessage = errorMessage;
  private readonly focusFirstInvalid = injectFocusFirstInvalid();
  protected readonly sides = COIN_SIDES;

  /** Pending photo changes per side, applied after the coin itself is saved. */
  protected readonly photoChanges: Record<CoinSide, WritableSignal<ImageChange | null>> = {
    National: signal<ImageChange | null>(null),
    Common: signal<ImageChange | null>(null),
  };
  protected readonly viewerSide = signal<CoinSide | null>(null);
  /** Router state of the Cancel link: it drops the changes without asking. */
  protected readonly discardChanges = DISCARD_CHANGES_STATE;
  /** Saved or deleted: the way back to the list does not ask about the form. */
  private finished = false;

  protected readonly form = this.fb.group({
    collectionId: this.fb.control<number | null>(null, Validators.required),
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

  constructor() {
    this.countryService.load();

    this.collectionService.list().subscribe({
      next: (list) => {
        this.collections.set(list);
        // Create mode: the collection the form was opened from, otherwise the first one
        const control = this.form.controls.collectionId;
        if (control.value === null && !this.isEdit()) {
          const wanted = Number(this.collection());
          control.setValue(list.find((c) => c.id === wanted)?.id ?? list[0]?.id ?? null);
        }
      },
      error: () => {
        this.collectionsError.set(true);
        this.collections.set([]);
      },
    });

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

    this.coinId.set(id);
    this.loading.set(true);
    this.coinService.get(id).subscribe({
      next: (coin) => {
        this.coin.set(coin);
        this.patchForm(coin);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          this.formErrors.set([translate('coinForm.loadError')]);
        }
      },
    });
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.submitting.set(true);
    this.formErrors.set([]);

    let coin: Coin;
    try {
      const request = this.toRequest();
      const id = this.coinId();
      coin = await firstValueFrom(
        id === null ? this.coinService.create(request) : this.coinService.update(id, request),
      );
    } catch (err) {
      this.submitting.set(false);
      const error = err as HttpErrorResponse;
      this.formErrors.set(
        applyServerErrors(this.form, error, {}, { moderation_locked: 'coinForm.moveLocked' }),
      );
      this.focusFirstInvalid();
      return;
    }

    this.coinId.set(coin.id);
    this.coin.set(coin);
    // The fields are saved; failed photo changes stay pending
    this.form.markAsPristine();

    const failures = await this.savePhotos(coin.id);
    this.submitting.set(false);
    if (failures.length === 0) {
      this.backToCollection();
      return;
    }

    // The coin exists now: a retry must update it, not create another one. The address follows
    // without a navigation, which would recreate the form and drop the pending photos
    this.location.replaceState(
      this.router.serializeUrl(this.router.createUrlTree(['/coins', coin.id, 'edit'])),
    );
    this.formErrors.set([translate('coinForm.photosFailed'), ...failures]);
  }

  protected async remove(): Promise<void> {
    const id = this.coinId();
    if (id === null) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: translate('coinForm.deleteTitle'),
      message: translate('coinForm.deleteMessage', { title: this.form.controls.title.value }),
      confirmText: translate('common.delete'),
      cancelText: translate('common.cancel'),
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.deleting.set(true);
    this.formErrors.set([]);

    this.coinService.delete(id).subscribe({
      next: () => this.backToCollection(),
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        // Already gone (e.g. deleted in another tab) is fine
        if (err.status === 404) {
          this.backToCollection();
          return;
        }
        this.formErrors.set(applyServerErrors(this.form, err));
      },
    });
  }

  private backToCollection(): void {
    this.finished = true;
    this.router.navigateByUrl(this.returnTree());
  }

  /** Typed fields or a chosen photo not saved yet (unsavedChangesGuard asks before leaving). */
  hasUnsavedChanges(): boolean {
    return (
      !this.finished &&
      (this.form.dirty || COIN_SIDES.some((side) => this.photoChanges[side]() !== null))
    );
  }

  /** Closing or reloading the tab: the browser shows its own warning (its text is fixed). */
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  protected storedPhoto(side: CoinSide): CoinPhoto | undefined {
    return this.coin()?.photos.find((p) => p.side === side);
  }

  /** Applies the pending photo changes one by one; returns messages for the failed ones. */
  private async savePhotos(coinId: number): Promise<string[]> {
    const failures: string[] = [];
    for (const side of COIN_SIDES) {
      const change = this.photoChanges[side]();
      if (!change) {
        continue;
      }
      try {
        if (change.type === 'upload') {
          this.coin.set(
            await firstValueFrom(this.coinService.uploadPhoto(coinId, side, change.image)),
          );
        } else {
          await firstValueFrom(this.coinService.deletePhoto(coinId, side));
          this.dropStoredPhoto(side);
        }
        this.photoChanges[side].set(null);
      } catch (err) {
        const error = err as HttpErrorResponse;
        // Already removed (e.g. in another tab) is what we wanted
        if (change.type === 'remove' && error.status === 404) {
          this.dropStoredPhoto(side);
          this.photoChanges[side].set(null);
          continue;
        }
        failures.push(`${translate(`coin.side.${side}.label`)}: ${photoErrorMessage(error)}`);
      }
    }
    return failures;
  }

  private dropStoredPhoto(side: CoinSide): void {
    this.coin.update((c) => c && { ...c, photos: c.photos.filter((p) => p.side !== side) });
  }

  private patchForm(coin: Coin): void {
    this.form.setValue({
      collectionId: coin.collectionId,
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
      collectionId: v.collectionId as number,
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
