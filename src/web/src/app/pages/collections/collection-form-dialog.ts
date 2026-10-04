import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import {
  COLLECTION_LIMITS,
  Collection,
  CollectionVisibility,
  VISIBILITIES,
} from '../../core/collections/collection.models';
import {
  COLLECTION_ERROR_CODES,
  COLLECTION_ERROR_MESSAGE_KEYS,
  CollectionService,
  collectionErrorMessage,
  shareLink,
} from '../../core/collections/collection.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { confirmDiscardChanges } from '../../shared/unsaved-changes';
import { VisibilityBadge } from '../../shared/visibility-badge/visibility-badge';
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
  imports: [ReactiveFormsModule, TranslocoPipe, CoverPicker, VisibilityBadge],
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="dialog-panel max-w-lg"
      (cancel)="onCancel($event)"
      (close)="onClose()"
    >
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="space-y-5 p-6">
        <h2 [id]="titleId" class="text-lg font-semibold">
          {{ (saved() ? 'collectionForm.titleEdit' : 'collectionForm.titleNew') | transloco }}
        </h2>

        @if (formErrors().length) {
          <div role="alert" class="alert-error">
            @for (message of formErrors(); track $index) {
              <p>{{ message }}</p>
            }
          </div>
        }

        <div>
          <label [for]="titleId + '-name'" class="form-label">{{
            'collectionForm.name' | transloco
          }}</label>
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
            <p class="form-hint">{{ 'collectionForm.nameHint' | transloco }}</p>
          }
        </div>

        <div>
          <label [for]="titleId + '-description'" class="form-label">{{
            'collectionForm.description' | transloco
          }}</label>
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
              {{ 'common.optional' | transloco }}
              {{ form.controls.description.value.length }}/{{ limits.descriptionMaxLength }}
            </p>
          }
        </div>

        @if (collection()?.moderationLocked) {
          <!-- Hidden by an admin: stays private, so no choice (the API refuses another one) -->
          <div>
            <p class="form-label">{{ 'collectionForm.visibility' | transloco }}</p>
            <div
              class="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800"
            >
              <app-visibility-badge visibility="Private" [moderationLocked]="true" />
              <p class="mt-2">{{ 'collectionForm.moderationLocked' | transloco }}</p>
            </div>
          </div>
        } @else {
          <fieldset>
            <legend class="form-label">{{ 'collectionForm.visibility' | transloco }}</legend>
            <div class="space-y-2">
              @for (option of visibilityOptions; track option) {
                <label
                  class="flex cursor-pointer items-start gap-3 rounded-lg border border-shade-200 p-3 transition-colors
                            hover:bg-shade-50 has-checked:border-brand-400 has-checked:bg-brand-50"
                >
                  <input
                    type="radio"
                    formControlName="visibility"
                    [value]="option"
                    class="mt-1 accent-brand-500"
                  />
                  <span class="text-sm">
                    <span class="flex items-center gap-2 font-medium text-shade-900">
                      <app-visibility-badge [visibility]="option" />
                    </span>
                    <span class="mt-1 block text-shade-600">{{
                      'visibility.' + option + '.description' | transloco
                    }}</span>
                  </span>
                </label>
              }
            </div>

            @if (pendingVisibilityNote(); as note) {
              <p class="form-hint">{{ note | transloco }}</p>
            } @else if (link(); as url) {
              <div class="mt-3 rounded-lg bg-shade-50 p-3">
                <p class="text-xs font-medium text-shade-600">
                  {{
                    (saved()?.visibility === 'Unlisted'
                      ? 'collectionForm.unlistedLink'
                      : 'collectionForm.publicLink'
                    ) | transloco
                  }}
                </p>
                <div class="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    readonly
                    [value]="url"
                    class="form-input min-w-0 flex-1 py-1.5 text-sm"
                    [attr.aria-label]="'collectionForm.shareLink' | transloco"
                    (focus)="$any($event.target).select()"
                  />
                  <button
                    type="button"
                    class="btn-secondary shrink-0 px-3 py-1.5 text-sm"
                    (click)="copy(url)"
                  >
                    {{
                      (copied()
                        ? 'common.copied'
                        : copyFailed()
                          ? 'common.copyFailed'
                          : 'common.copy'
                      ) | transloco
                    }}
                  </button>
                </div>
                @if (saved()?.visibility === 'Unlisted') {
                  <button
                    type="button"
                    class="link mt-2 text-sm"
                    [disabled]="regenerating()"
                    (click)="regenerate()"
                  >
                    {{
                      (regenerating() ? 'collectionForm.regenerating' : 'collectionForm.regenerate')
                        | transloco
                    }}
                  </button>
                  <span class="text-xs text-shade-500">
                    {{ 'collectionForm.regenerateNote' | transloco }}</span
                  >
                }
              </div>
            }
          </fieldset>
        }

        <app-cover-picker [collection]="saved()" [disabled]="saving()" [(change)]="coverChange" />

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" class="btn-secondary" (click)="close()">
            {{ 'common.cancel' | transloco }}
          </button>
          <button type="submit" class="btn-primary" [disabled]="saving()">
            {{
              (saving() ? 'common.saving' : saved() ? 'common.save' : 'common.create') | transloco
            }}
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class CollectionFormDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly collectionService = inject(CollectionService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly auth = inject(AuthService);

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
    visibility: this.fb.control<CollectionVisibility>('Private'),
  });

  protected readonly visibilityOptions = VISIBILITIES;
  protected readonly copied = signal(false);
  protected readonly copyFailed = signal(false);
  protected readonly regenerating = signal(false);
  private readonly chosenVisibility = toSignal(this.form.controls.visibility.valueChanges, {
    initialValue: this.form.controls.visibility.value,
  });

  /** Link of the saved state; changes only take effect on save. */
  protected readonly link = computed(() => {
    const saved = this.saved();
    const user = this.auth.currentUser();
    return saved && user ? shareLink(saved, user.userName) : null;
  });

  /** What saving will do when the chosen visibility differs from the saved one (a key). */
  protected readonly pendingVisibilityNote = computed(() => {
    const chosen = this.chosenVisibility();
    const current = this.saved()?.visibility ?? 'Private';
    if (chosen === current) {
      return null;
    }
    if (current === 'Unlisted') {
      return 'collectionForm.noteLinkWillStop';
    }
    return chosen === 'Unlisted'
      ? 'collectionForm.noteLinkWillBeCreated'
      : chosen === 'Public'
        ? 'collectionForm.noteWillBePublic'
        : null;
  });

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => {
      const collection = this.collection();
      if (collection) {
        this.form.setValue({
          name: collection.name,
          description: collection.description ?? '',
          visibility: collection.visibility,
        });
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
      const request = {
        name,
        description: this.form.controls.description.value.trim() || null,
        visibility: this.form.controls.visibility.value,
      };
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
            COLLECTION_ERROR_MESSAGE_KEYS,
          ),
        );
        return;
      }
      this.saved.set(collection);
      this.savedAny = true;
      // The fields are saved; only a failed cover change is still pending
      this.form.markAsPristine();

      const coverError = await this.saveCover(collection);
      if (coverError) {
        // The collection exists now; a retry updates it and only sends the cover again
        this.formErrors.set([translate('collectionForm.coverFailed'), coverError]);
        return;
      }

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

  protected async copy(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard not allowed (e.g. insecure context): say so, the field is selectable anyway
      this.copyFailed.set(true);
      setTimeout(() => this.copyFailed.set(false), 3000);
    }
  }

  /** New secret for the share link; the old link stops working right away. */
  protected async regenerate(): Promise<void> {
    const saved = this.saved();
    if (!saved) {
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: translate('collectionForm.regenerate'),
      message: translate('collectionForm.regenerateMessage'),
      confirmText: translate('collectionForm.regenerate'),
      cancelText: translate('common.cancel'),
    });
    if (!confirmed) {
      return;
    }

    this.regenerating.set(true);
    this.formErrors.set([]);
    try {
      const { shareToken } = await firstValueFrom(
        this.collectionService.regenerateShareToken(saved.id),
      );
      this.saved.set({ ...saved, shareToken });
      this.savedAny = true;
    } catch (err) {
      this.formErrors.set([collectionErrorMessage(err as HttpErrorResponse)]);
    } finally {
      this.regenerating.set(false);
    }
  }

  /** Cancel button: leaves without a question, the user chose to drop the changes. */
  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /**
   * Escape: ignored while a request runs (it would finish unseen), asks first when there is
   * unsaved input. Chrome lets a page stop Escape only after a user interaction, so a second
   * Escape in a row may still close; whatever was saved is reported anyway (onClose).
   */
  protected async onCancel(event: Event): Promise<void> {
    if (this.saving() || this.regenerating()) {
      event.preventDefault();
      return;
    }
    if (!this.form.dirty && this.coverChange() === null) {
      return;
    }
    event.preventDefault();
    if (await confirmDiscardChanges(this.confirmDialog)) {
      this.close();
    }
  }

  // Single exit point: buttons and Escape all end up here. Whatever was saved (a create whose
  // cover failed, a new share link) is reported even when the dialog is cancelled afterwards.
  protected onClose(): void {
    this.closed.emit(this.savedAny ? this.saved() : null);
  }
}
