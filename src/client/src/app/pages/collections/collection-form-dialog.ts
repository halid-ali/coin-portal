import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { COLLECTION_LIMITS, Collection } from '../../core/collections/collection.models';
import {
  COLLECTION_ERROR_CODES,
  COLLECTION_ERROR_MESSAGES,
  CollectionService,
} from '../../core/collections/collection.service';
import { photoErrorMessage } from '../../core/coins/photo-errors';
import { applyServerErrors } from '../../core/http/problem-details';
import { errorMessage } from '../../shared/form-errors';
import { ImageChange } from '../../shared/image-change';
import { CoverPicker } from './cover-picker';

let nextId = 0;

/**
 * Create (no `collection` input) or edit a collection (name, description, cover) in a modal
 * <dialog>. The cover change is applied after the collection itself is saved. Emits the saved
 * collection, or null when nothing was saved.
 */
@Component({
  selector: 'app-collection-form-dialog',
  imports: [ReactiveFormsModule, CoverPicker],
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="dialog-panel max-w-md"
      (close)="onClose()"
    >
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="space-y-5 p-6">
        <h2 [id]="titleId" class="text-lg font-semibold">
          {{ saved() ? 'Koleksiyonu düzenle' : 'Yeni koleksiyon' }}
        </h2>

        @if (formErrors().length) {
          <div role="alert" class="alert-error">
            @for (message of formErrors(); track $index) {
              <p>{{ message }}</p>
            }
          </div>
        }

        <div>
          <label [for]="titleId + '-name'" class="form-label">Ad</label>
          <input
            [id]="titleId + '-name'"
            type="text"
            formControlName="name"
            autofocus
            [maxlength]="limits.nameMaxLength"
            class="form-input"
          />
          @if (errorMessage(form.controls.name); as msg) {
            <p class="form-error">{{ msg }}</p>
          } @else {
            <p class="form-hint">Örn. Euro koleksiyonum, Takas listesi, Eksiklerim</p>
          }
        </div>

        <div>
          <label [for]="titleId + '-description'" class="form-label">Açıklama</label>
          <textarea
            [id]="titleId + '-description'"
            rows="3"
            formControlName="description"
            [maxlength]="limits.descriptionMaxLength"
            class="form-input"
          ></textarea>
          @if (errorMessage(form.controls.description); as msg) {
            <p class="form-error">{{ msg }}</p>
          } @else {
            <p class="form-hint">
              İsteğe bağlı. {{ form.controls.description.value.length }}/{{
                limits.descriptionMaxLength
              }}
            </p>
          }
        </div>

        <app-cover-picker [collection]="saved()" [disabled]="saving()" [(change)]="coverChange" />

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" class="btn-secondary" (click)="close()">Vazgeç</button>
          <button type="submit" class="btn-primary" [disabled]="saving()">
            {{ saving() ? 'Kaydediliyor…' : saved() ? 'Kaydet' : 'Oluştur' }}
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class CollectionFormDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly collectionService = inject(CollectionService);

  /** The collection to edit; omitted for a new one. */
  readonly collection = input<Collection>();
  readonly closed = output<Collection | null>();

  protected readonly titleId = `collection-form-${++nextId}`;
  protected readonly limits = COLLECTION_LIMITS;
  protected readonly errorMessage = errorMessage;
  protected readonly saving = signal(false);
  protected readonly formErrors = signal<string[]>([]);

  /** The collection as last saved: the input when editing, set after a create. */
  protected readonly saved = linkedSignal<Collection | null>(() => this.collection() ?? null);
  protected readonly coverChange = signal<ImageChange | null>(null);
  /** Something was saved, so closing reports the collection even when cancelled afterwards. */
  private savedAny = false;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(COLLECTION_LIMITS.nameMaxLength)]],
    description: ['', Validators.maxLength(COLLECTION_LIMITS.descriptionMaxLength)],
  });

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private result: Collection | null = null;

  constructor() {
    afterNextRender(() => {
      const collection = this.collection();
      if (collection) {
        this.form.setValue({ name: collection.name, description: collection.description ?? '' });
      }
      this.dialog().nativeElement.showModal();
    });
  }

  protected async save(): Promise<void> {
    const name = this.form.controls.name.value.trim();
    this.form.controls.name.setValue(name);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formErrors.set([]);
    try {
      const request = { name, description: this.form.controls.description.value.trim() || null };
      const existing = this.saved();
      let collection: Collection;
      try {
        collection = await firstValueFrom(
          existing
            ? this.collectionService.update(existing.id, request)
            : this.collectionService.create(request),
        );
      } catch (err) {
        this.formErrors.set(
          applyServerErrors(
            this.form,
            err as HttpErrorResponse,
            COLLECTION_ERROR_CODES,
            COLLECTION_ERROR_MESSAGES,
          ),
        );
        return;
      }
      this.saved.set(collection);
      this.savedAny = true;

      const coverError = await this.saveCover(collection);
      if (coverError) {
        // The collection exists now; a retry updates it and only sends the cover again
        this.formErrors.set(['Koleksiyon kaydedildi, ancak kapak kaydedilemedi:', coverError]);
        return;
      }

      this.result = this.saved();
      this.dialog().nativeElement.close();
    } finally {
      this.saving.set(false);
    }
  }

  /** Applies the pending cover change; returns an error message if it failed. */
  private async saveCover(collection: Collection): Promise<string | null> {
    const change = this.coverChange();
    if (!change) {
      return null;
    }
    try {
      if (change.type === 'upload') {
        const { coverImageId } = await firstValueFrom(
          this.collectionService.uploadCover(collection.id, change.image),
        );
        this.saved.set({ ...collection, coverImageId });
      } else {
        await firstValueFrom(this.collectionService.deleteCover(collection.id));
        this.saved.set({ ...collection, coverImageId: null });
      }
      this.coverChange.set(null);
      return null;
    } catch (err) {
      const error = err as HttpErrorResponse;
      // Already removed (e.g. in another tab) is what we wanted
      if (change.type === 'remove' && error.status === 404) {
        this.saved.set({ ...collection, coverImageId: null });
        this.coverChange.set(null);
        return null;
      }
      return photoErrorMessage(error);
    }
  }

  protected close(): void {
    this.result = this.savedAny ? this.saved() : null;
    this.dialog().nativeElement.close();
  }

  // Single exit point: buttons and Escape both end up here
  protected onClose(): void {
    this.closed.emit(this.result);
  }
}
