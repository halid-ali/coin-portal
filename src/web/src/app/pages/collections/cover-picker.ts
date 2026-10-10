import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { COVER_LIMITS, Collection } from '../../core/collections/collection.models';
import { coverUrl } from '../../core/collections/collection.service';
import { validatePhotoFile } from '../../core/coins/photo-errors';
import { ImageChange } from '../../shared/image-change';
import { PhotoCropDialog } from '../../shared/photo-crop-dialog/photo-crop-dialog';
import { ImageSkeleton } from '../../shared/image-skeleton';

/**
 * Collection cover in the collection form: a 16:9 preview of the pending upload or the uploaded
 * cover (without one, cards show the default picture). Choosing a file opens the crop dialog in 16:9;
 * the result is kept as a pending change (two-way bound `change`) and uploaded on save.
 */
@Component({
  selector: 'app-cover-picker',
  imports: [ImageSkeleton, PhotoCropDialog, TranslocoPipe],
  host: { class: 'block' },
  template: `
    <p class="form-label">{{ 'cover.title' | transloco }}</p>

    <div class="relative aspect-video overflow-hidden rounded-lg bg-shade-100">
      @if (displayUrl(); as src) {
        <img appImageSkeleton [src]="src" alt="" class="size-full object-cover" />
      } @else {
        <button
          type="button"
          [disabled]="disabled()"
          (click)="choose()"
          class="flex size-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-shade-300
                       text-shade-600 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-7"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M4 16l4.6-4.6a2 2 0 0 1 2.8 0L16 16m-2-2 1.6-1.6a2 2 0 0 1 2.8 0L20 14M14 8h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
            />
          </svg>
          <span class="text-sm font-medium">{{ 'cover.choose' | transloco }}</span>
        </button>
      }

      @if (badge(); as text) {
        <span
          class="absolute top-2 left-2 rounded-full bg-shade-0/90 px-2 py-0.5 text-xs font-medium text-shade-700 shadow-sm"
        >
          {{ text | transloco }}
        </span>
      }
    </div>

    <input
      #fileInput
      type="file"
      class="hidden"
      accept="image/jpeg,image/png"
      (change)="onFileChosen($event)"
    />

    <div class="mt-2 flex flex-wrap gap-2">
      @if (displayUrl()) {
        <button
          type="button"
          class="btn-secondary px-3 py-1.5 text-sm"
          [disabled]="disabled()"
          (click)="choose()"
        >
          {{ (hasOwnCover() ? 'common.change' : 'cover.upload') | transloco }}
        </button>
      }
      @if (hasOwnCover()) {
        <button
          type="button"
          class="btn-secondary-danger px-3 py-1.5 text-sm"
          [disabled]="disabled()"
          (click)="remove()"
        >
          {{ 'common.remove' | transloco }}
        </button>
      }
      @if (change() && collection()?.coverImageId) {
        <button
          type="button"
          class="btn-secondary px-3 py-1.5 text-sm"
          [disabled]="disabled()"
          (click)="change.set(null)"
        >
          {{ 'common.undo' | transloco }}
        </button>
      }
    </div>
    <p class="form-hint">
      {{ 'cover.hint' | transloco }}
    </p>
    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }

    @if (chosenFile(); as file) {
      <app-photo-crop-dialog
        [file]="file"
        [title]="'cover.cropTitle' | transloco"
        [aspectRatio]="aspectRatio"
        [round]="false"
        [minWidth]="minWidth"
        [hint]="'cover.cropHint' | transloco"
        (closed)="onCropped($event)"
      />
    }
  `,
})
export class CoverPicker {
  /** The saved collection; omitted while creating one. */
  readonly collection = input<Collection | null>(null);
  readonly disabled = input(false);
  readonly change = model<ImageChange | null>(null);

  protected readonly aspectRatio = COVER_LIMITS.aspectRatio;
  protected readonly minWidth = COVER_LIMITS.minWidth;
  protected readonly chosenFile = signal<File | null>(null);
  protected readonly error = signal<string | null>(null);
  private readonly pendingUrl = signal<string | null>(null);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  /** An own cover will be shown after saving (pending upload or uploaded, not removed). */
  protected readonly hasOwnCover = computed(() => {
    const change = this.change();
    return change?.type === 'upload' || (!change && !!this.collection()?.coverImageId);
  });

  protected readonly displayUrl = computed(() => {
    const change = this.change();
    if (change?.type === 'upload') {
      return this.pendingUrl();
    }
    const collection = this.collection();
    // After a removal the card shows the default picture; here the empty picker does
    return collection && change?.type !== 'remove' ? coverUrl(collection) : null;
  });

  /** Translation key of the badge on the preview, if any. */
  protected readonly badge = computed(() => {
    const change = this.change();
    if (change?.type === 'upload') {
      return 'photo.willUpload';
    }
    return change?.type === 'remove' ? 'photo.willRemove' : null;
  });

  constructor() {
    // Object URL for the pending image, released when it changes or the picker goes away
    effect((onCleanup) => {
      const change = this.change();
      if (change?.type !== 'upload') {
        this.pendingUrl.set(null);
        return;
      }
      const url = URL.createObjectURL(change.image);
      this.pendingUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }

  protected choose(): void {
    this.fileInput().nativeElement.click();
  }

  protected onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset, so choosing the same file again still fires (change)
    input.value = '';
    if (!file) {
      return;
    }
    const problem = validatePhotoFile(file);
    this.error.set(problem);
    if (!problem) {
      this.chosenFile.set(file);
    }
  }

  protected onCropped(image: Blob | null): void {
    this.chosenFile.set(null);
    if (image) {
      this.change.set({ type: 'upload', image });
    }
  }

  protected remove(): void {
    this.error.set(null);
    // Nothing uploaded yet: just drop the pending upload
    this.change.set(this.collection()?.coverImageId ? { type: 'remove' } : null);
  }
}
