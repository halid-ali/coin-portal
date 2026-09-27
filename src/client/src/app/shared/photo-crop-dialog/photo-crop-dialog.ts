import {
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ImageCropperComponent, ImageTransform } from 'ngx-image-cropper';

import { PHOTO_LIMITS } from '../../core/coins/coin.models';

let nextId = 0;

/**
 * Square crop of a chosen photo in a modal <dialog>. The round guide helps centering the
 * coin; the result is still square. Emits the cropped image (JPEG, at most 1600 px), or
 * null when cancelled. The API validates and re-encodes it anyway.
 * No close on backdrop click: a drag that ends outside the panel would count as one.
 */
@Component({
  selector: 'app-photo-crop-dialog',
  imports: [ImageCropperComponent],
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="dialog-panel max-w-lg"
      (close)="onClose()"
    >
      <div class="space-y-4 p-6">
        <div>
          <h2 [id]="titleId" class="text-lg font-semibold">{{ title() }}</h2>
          <p class="mt-1 text-sm text-slate-600">
            Madeni parayı daireye ortala. Çerçeveyi sürükleyip köşelerinden boyutlandırabilirsin.
          </p>
        </div>

        <div
          class="flex min-h-64 items-center justify-center overflow-hidden rounded-lg bg-slate-900/90"
        >
          @if (failed()) {
            <p class="p-6 text-center text-sm text-white">
              Fotoğraf açılamadı. Başka bir dosya dene.
            </p>
          } @else {
            <image-cropper
              class="max-h-[55dvh]"
              [imageFile]="file()"
              [autoCrop]="false"
              [maintainAspectRatio]="true"
              [aspectRatio]="1"
              [roundCropper]="true"
              [transform]="transform()"
              [canvasRotation]="rotation()"
              [cropperMinWidth]="minPixels"
              format="jpeg"
              [imageQuality]="92"
              [resizeToWidth]="maxPixels"
              [onlyScaleDown]="true"
              output="blob"
              (cropperReady)="ready.set(true)"
              (loadImageFailed)="failed.set(true)"
            />
          }
        </div>

        <div class="flex items-center gap-3">
          <label for="zoom-{{ titleId }}" class="text-sm font-medium text-slate-700"
            >Yakınlaştır</label
          >
          <input
            id="zoom-{{ titleId }}"
            type="range"
            min="1"
            max="3"
            step="0.05"
            class="flex-1 accent-amber-500"
            [value]="transform().scale ?? 1"
            [disabled]="!ready()"
            (input)="zoom($any($event.target).valueAsNumber)"
          />
          <button
            type="button"
            class="btn-icon"
            title="90° döndür"
            aria-label="90 derece döndür"
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
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" class="btn-secondary" (click)="close()">Vazgeç</button>
          <button
            type="button"
            class="btn-primary"
            [disabled]="!ready() || cropping()"
            (click)="use()"
          >
            {{ cropping() ? 'Hazırlanıyor…' : 'Kullan' }}
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class PhotoCropDialog {
  readonly file = input.required<File>();
  readonly title = input('Fotoğrafı kırp');
  readonly closed = output<Blob | null>();

  protected readonly titleId = `crop-title-${++nextId}`;
  protected readonly minPixels = PHOTO_LIMITS.minPixels;
  protected readonly maxPixels = PHOTO_LIMITS.maxPixels;
  protected readonly ready = signal(false);
  protected readonly failed = signal(false);
  protected readonly cropping = signal(false);
  protected readonly transform = signal<ImageTransform>({ scale: 1 });
  protected readonly rotation = signal(0);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cropper = viewChild(ImageCropperComponent);
  private result: Blob | null = null;

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected zoom(scale: number): void {
    this.transform.update((t) => ({ ...t, scale }));
  }

  protected rotate(): void {
    this.rotation.update((r) => (r + 1) % 4);
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
