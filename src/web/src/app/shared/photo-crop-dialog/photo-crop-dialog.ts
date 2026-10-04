import {
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ImageCropperComponent, ImageTransform } from 'ngx-image-cropper';

import { PHOTO_LIMITS } from '../../core/coins/coin.models';
import { isHeic } from '../../core/coins/photo-errors';

let nextId = 0;

const INITIAL_TRANSFORM: ImageTransform = { scale: 1, translateUnit: 'px' };

/**
 * Crop of a chosen image in a modal <dialog>. Defaults fit coin photos: square with a round
 * guide that helps centering the coin (the result is still square). Collection covers use a
 * 16:9 rectangle. Emits the cropped image (JPEG, at most 1600 px wide), or null when cancelled.
 * The API validates and re-encodes it anyway.
 * No close on backdrop click: a drag that ends outside the panel would count as one.
 */
@Component({
  selector: 'app-photo-crop-dialog',
  imports: [ImageCropperComponent, TranslocoPipe],
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="dialog-panel max-w-lg"
      (cancel)="cropping() && $event.preventDefault()"
      (close)="onClose()"
    >
      <div class="space-y-4 p-6">
        <div>
          <h2 [id]="titleId" class="text-lg font-semibold">
            {{ title() ?? ('crop.title' | transloco) }}
          </h2>
          <p class="mt-1 text-sm text-shade-600">{{ hint() ?? ('crop.hint' | transloco) }}</p>
        </div>

        <div
          class="flex min-h-64 items-center justify-center overflow-hidden rounded-lg bg-slate-900/90"
        >
          @if (failed()) {
            <p class="p-6 text-center text-sm text-white">
              {{ (isHeic(file()) ? 'crop.heicFailed' : 'crop.openFailed') | transloco }}
            </p>
          } @else {
            <image-cropper
              class="max-h-[55dvh]"
              [imageFile]="file()"
              [autoCrop]="false"
              [maintainAspectRatio]="true"
              [aspectRatio]="aspectRatio()"
              [roundCropper]="round()"
              [transform]="transform()"
              [allowMoveImage]="true"
              [canvasRotation]="rotation()"
              [cropperMinWidth]="minWidth()"
              format="jpeg"
              [imageQuality]="92"
              [resizeToWidth]="maxPixels"
              [onlyScaleDown]="true"
              output="blob"
              (transformChange)="transform.set($event)"
              (cropperReady)="ready.set(true)"
              (loadImageFailed)="failed.set(true)"
            />
          }
        </div>

        <div class="flex items-center gap-3">
          <label for="zoom-{{ titleId }}" class="text-sm font-medium text-shade-700">{{
            'crop.zoom' | transloco
          }}</label>
          <input
            id="zoom-{{ titleId }}"
            type="range"
            min="1"
            max="3"
            step="0.05"
            class="flex-1 accent-brand-500"
            [value]="transform().scale ?? 1"
            [disabled]="!ready()"
            (input)="zoom($any($event.target).valueAsNumber)"
          />
          <button
            type="button"
            class="btn-icon"
            [title]="'crop.rotate' | transloco"
            [attr.aria-label]="'crop.rotateLabel' | transloco"
            [disabled]="!ready()"
            (click)="rotate()"
          >
            <svg
              viewBox="0 0 24 24"
              class="size-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
            </svg>
          </button>
          <button
            type="button"
            class="btn-icon"
            [title]="'crop.reset' | transloco"
            [attr.aria-label]="'crop.resetLabel' | transloco"
            [disabled]="!ready()"
            (click)="reset()"
          >
            <svg
              viewBox="0 0 24 24"
              class="size-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4M12 9v6M9 12h6" />
            </svg>
          </button>
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" class="btn-secondary" (click)="close()">
            {{ 'common.cancel' | transloco }}
          </button>
          <button
            type="button"
            class="btn-primary"
            [disabled]="!ready() || cropping()"
            (click)="use()"
          >
            {{ (cropping() ? 'crop.preparing' : 'crop.use') | transloco }}
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class PhotoCropDialog {
  readonly file = input.required<File>();
  /** Translated title; defaults to crop.title. */
  readonly title = input<string | null>(null);
  /** Width / height of the result. */
  readonly aspectRatio = input(1);
  /** Round guide (coins); the result stays rectangular. */
  readonly round = input(true);
  /** Smallest crop width in source pixels (the API rejects smaller images). */
  readonly minWidth = input<number>(PHOTO_LIMITS.minPixels);
  /** Translated hint; defaults to crop.hint (the round coin guide). */
  readonly hint = input<string | null>(null);
  readonly closed = output<Blob | null>();

  protected readonly titleId = `crop-title-${++nextId}`;
  protected readonly maxPixels = PHOTO_LIMITS.maxPixels;
  protected readonly isHeic = isHeic;
  protected readonly ready = signal(false);
  protected readonly failed = signal(false);
  protected readonly cropping = signal(false);
  // Pixels: the cropper adds the mouse movement in px to translateH/V; with the default
  // percent unit an 80 px drag would move the image by 80 %
  protected readonly transform = signal<ImageTransform>(INITIAL_TRANSFORM);
  protected readonly rotation = signal(0);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cropper = viewChild(ImageCropperComponent);
  private result: Blob | null = null;

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  // Keeps the position (translateH/V) from dragging, only the scale changes
  protected zoom(scale: number): void {
    this.transform.update((t) => ({ ...t, scale }));
  }

  protected rotate(): void {
    this.rotation.update((r) => (r + 1) % 4);
  }

  /** Back to the starting point after zooming or dragging too far. */
  protected reset(): void {
    this.transform.set(INITIAL_TRANSFORM);
    this.rotation.set(0);
    this.cropper()?.resetCropperPosition();
  }

  protected async use(): Promise<void> {
    this.cropping.set(true);
    const event = await this.cropper()?.crop('blob');
    this.cropping.set(false);
    if (event?.blob) {
      this.result = event.blob;
      this.dialog().nativeElement.close();
    }
  }

  protected close(): void {
    this.result = null;
    this.dialog().nativeElement.close();
  }

  // Single exit point: buttons and Escape both end up here
  protected onClose(): void {
    this.closed.emit(this.result);
  }
}
