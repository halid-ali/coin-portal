import {
  Directive,
  ElementRef,
  afterRenderEffect,
  inject,
  input,
  linkedSignal,
} from '@angular/core';

/**
 * A photo from the server: a placeholder shape (`.skeleton`) in its place until it has arrived or
 * failed (user choice 2026-10-10), so a slow connection does not look like a coin without photos.
 * No delay, unlike a list: there is nothing else to show meanwhile. A photo the browser has already
 * is shown without the shape. The element's own corners and background win over the shape's.
 *
 * `<img appImageSkeleton [src]="url" alt="" …>`: it takes the address, so a new one (another
 * side) shows the shape again.
 */
@Directive({
  selector: 'img[appImageSkeleton]',
  host: {
    '[src]': 'src()',
    '[class.skeleton]': 'waiting()',
    '(load)': 'waiting.set(false)',
    '(error)': 'waiting.set(false)',
  },
})
export class ImageSkeleton {
  readonly src = input.required<string>();

  private readonly img = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  /** True again for every new address. */
  protected readonly waiting = linkedSignal(() => {
    this.src();
    return true;
  });

  constructor() {
    afterRenderEffect(() => {
      this.src();
      // Already in the browser: no shape for a moment
      if (this.img.complete && this.img.naturalWidth > 0) {
        this.waiting.set(false);
      }
    });
  }
}
