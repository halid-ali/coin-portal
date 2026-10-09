import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { Component, OnInit, WritableSignal, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, UrlTree } from '@angular/router';
import { TranslocoPipe, translate } from '@jsverse/transloco';
import { firstValueFrom, merge } from 'rxjs';

import {
  COIN_KINDS,
  COIN_LIMITS,
  COIN_SIDES,
  Coin,
  CoinKind,
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
import {
  coinWithPhotosErrorMessage,
  isQuotaExceeded,
  photoErrorMessage,
} from '../../core/coins/photo-errors';
import { MessageKey, applyServerErrors } from '../../core/http/problem-details';
import { Breadcrumbs, Crumb } from '../../shared/breadcrumbs/breadcrumbs';
import {
  denominationLabel,
  faceValueLabel,
  sideHintKey,
  sideLabelKey,
  suggestTitle,
  suggestTitleFromValue,
} from '../../shared/coin-format';
import { LanguageService } from '../../core/i18n/language.service';
import { faceValueInput, faceValueValidator, parseFaceValue } from './face-value';
import { errorMessage, injectFocusFirstInvalid } from '../../shared/form-errors';
import { integerValidator } from '../../shared/validators';
import { FieldA11y } from '../../shared/field-a11y';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { PhotoViewer } from '../../shared/photo-viewer/photo-viewer';
import { ImageChange } from '../../shared/image-change';
import { DISCARD_CHANGES_STATE, HasUnsavedChanges } from '../../shared/unsaved-changes';
import { UNPUBLISH_DECLINED, UnpublishConfirm } from '../../shared/unpublish-confirm';
import { PhotoSlot } from './photo-slot';

/** Create (/coins/new?collection=<id>) and edit (/coins/:id/edit) in one component. */
@Component({
  selector: 'app-coin-form',
  imports: [
    ReactiveFormsModule,
    FieldA11y,
    RouterLink,
    TranslocoPipe,
    Breadcrumbs,
    PhotoSlot,
    PhotoViewer,
  ],
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
  private readonly unpublishConfirm = inject(UnpublishConfirm);
  private readonly language = inject(LanguageService);

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

  /**
   * My collections > the coin's collection > Add coin / Edit coin. The collection step leads to
   * the list the user came from when it is that collection's (view, filters, page), otherwise to
   * the collection itself; without a known collection the step is left out.
   */
  protected readonly breadcrumbs = computed<readonly Crumb[]>(() => {
    const home: Crumb = { key: 'nav.collections', link: '/collections', icon: 'collections' };
    const current: Crumb = { key: this.isEdit() ? 'coinForm.titleEdit' : 'coinForm.titleNew' };
    const collectionId = this.coin()?.collectionId ?? (Number(this.collection()) || null);
    const name = this.collections()?.find((c) => c.id === collectionId)?.name;
    if (collectionId === null || name === undefined) {
      return [home, current];
    }
    const remembered = this.collectionReturn.url();
    const link =
      remembered?.split('?')[0] === `/collections/${collectionId}`
        ? this.router.parseUrl(remembered)
        : ['/collections', collectionId];
    return [home, { text: name, link }, current];
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
  /** A photo did not fit in the user's storage: the errors link to Settings > Account. */
  protected readonly quotaExceeded = signal(false);
  /** The user kept the national side photo to keep the collection public: not an error. */
  protected readonly photoKept = signal(false);

  /** The saved coin's collection is hidden by an admin: its coins stay in it (API 403). */
  protected readonly moveLocked = computed(() => {
    const collectionId = this.coin()?.collectionId;
    return !!this.collections()?.find((c) => c.id === collectionId)?.moderationLocked;
  });

  protected readonly denominations = DENOMINATIONS;
  protected readonly denominationLabel = denominationLabel;
  protected readonly kinds = COIN_KINDS;
  protected readonly limits = COIN_LIMITS;
  protected readonly sideLabelKey = sideLabelKey;
  protected readonly sideHintKey = sideHintKey;
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

  /** The API's save errors -> messages (its own are English and never shown). */
  private readonly saveMessageKeys: Record<string, MessageKey> = {
    moderation_locked: 'coinForm.moveLocked',
    // Deleted in another tab since the list was loaded
    CollectionId: 'coinForm.errors.unknownCollection',
    CountryCode: 'coinForm.errors.unknownCountry',
    Year: { key: 'validation.max', params: { max: this.maxYear } },
    // An other coin's fields are beside the form: their errors are shown above it
    FaceValue: 'coinForm.errors.faceValue',
    Currency: { key: 'validation.maxLength', params: { max: COIN_LIMITS.currencyMaxLength } },
  };

  protected readonly form = this.fb.group({
    collectionId: this.fb.control<number | null>(null, Validators.required),
    denomination: this.fb.control<Denomination | ''>('', Validators.required),
    countryCode: ['', Validators.required],
    year: this.fb.control<number | null>(null, [
      Validators.required,
      integerValidator,
      Validators.min(COIN_LIMITS.minYear),
      Validators.max(this.maxYear),
    ]),
    title: ['', [Validators.required, Validators.maxLength(COIN_LIMITS.titleMaxLength)]],
    mintMark: ['', Validators.maxLength(COIN_LIMITS.mintMarkMaxLength)],
    isCommemorative: [false],
    quantity: [
      1,
      [
        Validators.required,
        integerValidator,
        Validators.min(1),
        Validators.max(COIN_LIMITS.maxQuantity),
      ],
    ],
    description: ['', Validators.maxLength(COIN_LIMITS.descriptionMaxLength)],
  });

  /**
   * The kind and an other coin's value live beside the form: the fields both kinds share stay in
   * it as before (a euro coin is sent exactly as before other coins existed). Their validators
   * follow the kind (applyKind).
   */
  protected readonly kindControl = this.fb.control<CoinKind>('Euro');
  protected readonly otherForm = this.fb.group({
    faceValue: [''],
    currency: ['', Validators.maxLength(COIN_LIMITS.currencyMaxLength)],
  });
  protected readonly kind = signal<CoinKind>('Euro');
  /** Euro coins come from the euro issuers, other coins from any country. */
  protected readonly countries = computed(() =>
    this.kind() === 'Other' ? this.countryService.countries() : this.countryService.euroCountries(),
  );
  protected readonly minYear = computed(() =>
    this.kind() === 'Other' ? COIN_LIMITS.otherMinYear : COIN_LIMITS.minYear,
  );
  /** The user's currencies so far, offered while typing; loaded once an other coin is edited. */
  protected readonly currencySuggestions = signal<string[]>([]);
  private currenciesRequested = false;

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

    // Another kind chosen by the user: other fields and rules, and a euro coin's country must be
    // a euro issuer
    this.kindControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((kind) => {
      this.applyKind(kind);
      const countryCode = this.form.controls.countryCode;
      if (
        kind === 'Euro' &&
        countryCode.value &&
        !this.countryService.euroCountries().some((c) => c.code === countryCode.value)
      ) {
        countryCode.setValue('');
      }
    });

    // In create mode, fill the title from the value, country and year until the user edits it
    const { denomination, countryCode, year, title } = this.form.controls;
    const { faceValue, currency } = this.otherForm.controls;
    merge(
      denomination.valueChanges,
      countryCode.valueChanges,
      year.valueChanges,
      this.kindControl.valueChanges,
      faceValue.valueChanges,
      currency.valueChanges,
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.isEdit() || title.dirty) {
          return;
        }
        const country = countryCode.value ? this.countryService.name(countryCode.value) : null;
        title.setValue(
          this.kindControl.value === 'Other'
            ? suggestTitleFromValue(
                faceValueLabel(
                  parseFaceValue(faceValue.value),
                  currency.value.trim(),
                  this.language.current(),
                ),
                country,
                year.value,
              )
            : suggestTitle(denomination.value, country, year.value),
        );
      });
  }

  /**
   * The fields and rules of a kind: a euro coin needs its denomination and is dated 1999 or
   * later; an other coin needs its value and currency and can be from any year.
   */
  private applyKind(kind: CoinKind): void {
    this.kind.set(kind);
    const other = kind === 'Other';
    const { denomination, year } = this.form.controls;
    const { faceValue, currency } = this.otherForm.controls;
    denomination.setValidators(other ? [] : [Validators.required]);
    faceValue.setValidators(other ? [Validators.required, faceValueValidator] : []);
    currency.setValidators(
      other
        ? [Validators.required, Validators.maxLength(COIN_LIMITS.currencyMaxLength)]
        : [Validators.maxLength(COIN_LIMITS.currencyMaxLength)],
    );
    year.setValidators([
      Validators.required,
      integerValidator,
      Validators.min(other ? COIN_LIMITS.otherMinYear : COIN_LIMITS.minYear),
      Validators.max(this.maxYear),
    ]);
    for (const control of [denomination, year, faceValue, currency]) {
      control.updateValueAndValidity({ emitEvent: false });
    }
    if (other) {
      this.loadCurrencySuggestions();
    }
  }

  private loadCurrencySuggestions(): void {
    if (this.currenciesRequested) {
      return;
    }
    this.currenciesRequested = true;
    this.coinService.facets().subscribe({
      next: (facets) => this.currencySuggestions.set(facets.currencies),
      // Suggestions only: typing works without them
      error: () => (this.currenciesRequested = false),
    });
  }

  /** The face value's own message (the generic one would not say what a valid value is). */
  protected faceValueError(): string | null {
    const control = this.otherForm.controls.faceValue;
    return control.hasError('faceValue') && (control.touched || control.dirty)
      ? translate('coinForm.errors.faceValue')
      : errorMessage(control);
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
    if (this.form.invalid || this.otherForm.invalid) {
      this.form.markAllAsTouched();
      this.otherForm.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.submitting.set(true);
    this.formErrors.set([]);
    this.quotaExceeded.set(false);
    this.photoKept.set(false);

    const request = this.toRequest();
    const id = this.coinId();
    // A new coin takes its photos along: it never exists without them, even for a moment, so it
    // can join a public collection
    const uploads = id === null ? this.pendingUploads() : {};
    let saved: Coin | typeof UNPUBLISH_DECLINED;
    try {
      saved = await this.unpublishConfirm.run((unpublish) =>
        id !== null
          ? this.coinService.update(id, request, unpublish)
          : Object.keys(uploads).length > 0
            ? this.coinService.createWithPhotos(request, uploads, unpublish)
            : this.coinService.create(request, unpublish),
      );
    } catch (err) {
      this.submitting.set(false);
      const error = err as HttpErrorResponse;
      const photoError = coinWithPhotosErrorMessage(error, this.kind());
      this.quotaExceeded.set(isQuotaExceeded(error));
      this.formErrors.set(
        photoError ? [photoError] : applyServerErrors(this.form, error, {}, this.saveMessageKeys),
      );
      this.focusFirstInvalid();
      return;
    }
    if (saved === UNPUBLISH_DECLINED) {
      this.submitting.set(false);
      return;
    }

    const coin = saved;
    for (const side of Object.keys(uploads) as CoinSide[]) {
      this.photoChanges[side].set(null);
    }
    this.coinId.set(coin.id);
    this.coin.set(coin);
    // The fields are saved; failed photo changes stay pending
    this.form.markAsPristine();
    this.kindControl.markAsPristine();
    this.otherForm.markAsPristine();

    const failures = await this.savePhotos(coin.id);
    this.submitting.set(false);
    if (failures.length === 0 && !this.photoKept()) {
      this.backToCollection();
      return;
    }

    // The coin exists now: a retry must update it, not create another one. The address follows
    // without a navigation, which would recreate the form and drop the pending photos. A kept
    // photo stays on the page too, so the user sees why it is still there
    this.location.replaceState(
      this.router.serializeUrl(this.router.createUrlTree(['/coins', coin.id, 'edit'])),
    );
    if (failures.length > 0) {
      this.formErrors.set([translate('coinForm.photosFailed'), ...failures]);
    }
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

    try {
      const result = await this.unpublishConfirm.run((unpublish) =>
        this.coinService.delete(id, unpublish),
      );
      if (result === UNPUBLISH_DECLINED) {
        this.deleting.set(false);
        return;
      }
      this.backToCollection();
    } catch (err) {
      const error = err as HttpErrorResponse;
      this.deleting.set(false);
      // Already gone (e.g. deleted in another tab) is fine
      if (error.status === 404) {
        this.backToCollection();
        return;
      }
      this.formErrors.set(applyServerErrors(this.form, error));
    }
  }

  private backToCollection(): void {
    this.finished = true;
    this.router.navigateByUrl(this.returnTree());
  }

  /** Typed fields or a chosen photo not saved yet (unsavedChangesGuard asks before leaving). */
  hasUnsavedChanges(): boolean {
    return (
      !this.finished &&
      (this.form.dirty ||
        this.kindControl.dirty ||
        this.otherForm.dirty ||
        COIN_SIDES.some((side) => this.photoChanges[side]() !== null))
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

  /**
   * Applies the pending photo changes one by one; returns messages for the failed ones. A removal
   * the user takes back to keep the collection public is dropped and noted (photoKept).
   */
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
          // Without its national side the coin no longer counts for a public collection
          const result = await this.unpublishConfirm.run((unpublish) =>
            this.coinService.deletePhoto(coinId, side, unpublish),
          );
          if (result === UNPUBLISH_DECLINED) {
            this.photoKept.set(true);
            this.photoChanges[side].set(null);
            continue;
          }
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
        if (isQuotaExceeded(error)) {
          this.quotaExceeded.set(true);
        }
        failures.push(`${translate(sideLabelKey(this.kind(), side))}: ${photoErrorMessage(error)}`);
      }
    }
    return failures;
  }

  /** Chosen photos waiting to be uploaded, by side. */
  private pendingUploads(): Partial<Record<CoinSide, Blob>> {
    const uploads: Partial<Record<CoinSide, Blob>> = {};
    for (const side of COIN_SIDES) {
      const change = this.photoChanges[side]();
      if (change?.type === 'upload') {
        uploads[side] = change.image;
      }
    }
    return uploads;
  }

  private dropStoredPhoto(side: CoinSide): void {
    this.coin.update((c) => c && { ...c, photos: c.photos.filter((p) => p.side !== side) });
  }

  private patchForm(coin: Coin): void {
    // Not a choice of the user: no country reset, no title suggestion
    this.kindControl.setValue(coin.kind, { emitEvent: false });
    this.applyKind(coin.kind);
    this.otherForm.setValue({
      faceValue:
        coin.faceValue === null ? '' : faceValueInput(coin.faceValue, this.language.current()),
      currency: coin.currency ?? '',
    });
    this.form.setValue({
      collectionId: coin.collectionId,
      denomination: coin.denomination ?? '',
      countryCode: coin.countryCode,
      year: coin.year,
      title: coin.title,
      mintMark: coin.mintMark ?? '',
      isCommemorative: coin.isCommemorative,
      quantity: coin.quantity,
      description: coin.description ?? '',
    });
  }

  /** A euro coin goes without a kind, exactly as before other coins existed; an other coin names it. */
  private toRequest(): CoinUpsertRequest {
    const v = this.form.getRawValue();
    const fields = {
      collectionId: v.collectionId as number,
      title: v.title.trim(),
      description: v.description.trim() || null,
      countryCode: v.countryCode,
      year: v.year as number,
      mintMark: v.mintMark.trim() || null,
      isCommemorative: v.isCommemorative,
      quantity: v.quantity,
    };
    if (this.kindControl.value === 'Other') {
      const other = this.otherForm.getRawValue();
      return {
        ...fields,
        kind: 'Other',
        faceValue: parseFaceValue(other.faceValue) as number,
        currency: other.currency.trim(),
      };
    }
    return { ...fields, denomination: v.denomination as Denomination };
  }
}
