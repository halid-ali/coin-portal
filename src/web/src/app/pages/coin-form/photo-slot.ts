import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { CoinPhoto } from '../../core/coins/coin.models';
import { photoUrl } from '../../core/coins/coin.service';
import { validatePhotoFile } from '../../core/coins/photo-errors';
import { ImageChange } from '../../shared/image-change';
import { PhotoCropDialog } from '../../shared/photo-crop-dialog/photo-crop-dialog';

let nextId = 0;

/**
 * One photo side in the coin form. Choosing a file opens the crop dialog; the result is only
 * kept as a pending change (two-way bound `change`) and uploaded by the form on save.
 */
@Component({
  selector: 'app-photo-slot',
  imports: [PhotoCropDialog, TranslocoPipe],
  host: { class: 'block' },
  template: `
    <p class="form-label mb-0">{{ label() }}</p>
    <p class="mb-2 text-xs text-shade-500">{{ hint() }}</p>

    <div class="relative aspect-square overflow-hidden rounded-xl bg-shade-100">
      @if (displayUrl(); as src) {
        @if (canView()) {
          <button
            type="button"
            class="block size-full cursor-zoom-in"
            [attr.aria-label]="'photo.viewLarge' | transloco: { side: label() }"
            (click)="view.emit()"
          >
            <img [src]="src" [alt]="label()" class="size-full object-cover" />
          </button>
        } @else {
          <img [src]="src" [alt]="label()" class="size-full object-cover" />
        }
      } @else {
        <button
          type="button"
          [disabled]="disabled()"
          (click)="choose()"
          class="flex size-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
                       border-shade-300 p-4 text-center text-shade-500 transition-colors hover:border-brand-400
                       hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-8"
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
          <span class="text-sm font-medium">{{
            (change()?.type === 'remove' ? 'photo.willDelete' : 'photo.choose') | transloco
          }}</span>
          <span class="text-xs">{{ 'photo.fileHint' | transloco }}</span>
        </button>
      }

      @if (change()?.type === 'upload') {
        <span
          class="absolute top-2 left-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-900 shadow-sm"
        >
          {{ 'photo.willUpload' | transloco }}
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
          {{ 'common.change' | transloco }}
        </button>
        <button
          type="button"
          class="btn-secondary px-3 py-1.5 text-sm text-danger-700 hover:bg-danger-50"
          [disabled]="disabled()"
          (click)="remove()"
        >
          {{ 'common.remove' | transloco }}
        </button>
      }
      @if (change() && stored()) {
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

    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }

    @if (chosenFile(); as file) {
      <app-photo-crop-dialog
        [file]="file"
        [title]="'photo.cropTitle' | transloco: { side: label() }"
        (closed)="onCropped($event)"
      />
    }
  `,
})
export class PhotoSlot {
  /** Translated side name, e.g. "National side". */
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly coinId = input<number | null>(null);
  /** The saved photo of this side, if any. */
  readonly stored = input<CoinPhoto>();
  readonly disabled = input(false);
  readonly change = model<ImageChange | null>(null);
  /** Fullscreen view of the saved photo. */
  readonly view = output<void>();

  protected readonly chosenFile = signal<File | null>(null);
  protected readonly error = signal<string | null>(null);
  private readonly pendingUrl = signal<string | null>(null);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  /** Pending upload first, then the saved photo unless it is marked for removal. */
  protected readonly displayUrl = computed(() => {
    const change = this.change();
    if (change?.type === 'upload') {
      return this.pendingUrl();
    }
    const stored = this.stored();
    const coinId = this.coinId();
    return change?.type !== 'remove' && stored && coinId !== null
      ? photoUrl(coinId, stored, 'preview')
      : null;
  });

  protected readonly canView = computed(() => !this.change() && !!this.stored());

  constructor() {
    // Object URL for the pending image, released when it changes or the slot goes away
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
    // Nothing saved yet: just drop the pending upload
    this.change.set(this.stored() ? { type: 'remove' } : null);
  }
}
