import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { COIN_SIDES, CoinPhoto, CoinSide } from '../../core/coins/coin.models';
import { photoUrl } from '../../core/coins/coin.service';
import { WheelGesture } from './wheel-gesture';

let nextId = 0;

/**
 * Fullscreen view of a coin's photos (largest size) in a modal <dialog>, with a switch
 * between the national and common side (buttons, arrow keys or the mouse wheel). Render it with
 * @if and remove it on (closed), like the other dialogs.
 */
@Component({
  selector: 'app-photo-viewer',
  imports: [TranslocoPipe],
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="m-auto max-h-dvh w-full max-w-3xl bg-transparent p-4 text-white backdrop:bg-slate-950/85
             backdrop:backdrop-blur-sm"
      (click)="onDialogClick($event)"
      (keydown.arrowleft)="step(-1)"
      (keydown.arrowright)="step(1)"
      (wheel)="onWheel($event)"
    >
      <div class="flex items-center justify-between gap-4 pb-3">
        <h2 [id]="titleId" class="truncate text-base font-medium">{{ title() }}</h2>
        <button
          type="button"
          class="rounded-lg p-2 hover:bg-white/10 focus-visible:ring-2
                focus-visible:ring-white/60 focus-visible:outline-none"
          [attr.aria-label]="'common.close' | transloco"
          (click)="close()"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      @if (current(); as photo) {
        <img
          [src]="url(photo)"
          [alt]="title() + ' – ' + (sideKey(photo.side) | transloco)"
          class="mx-auto aspect-square max-h-[calc(100dvh-9rem)] w-full rounded-xl bg-slate-800 object-contain"
        />
      }

      @if (photos().length > 1) {
        <div class="mt-3 flex justify-center">
          <div
            class="inline-flex rounded-lg bg-white/10 p-1"
            role="group"
            [attr.aria-label]="'viewer.sides' | transloco"
          >
            @for (photo of photos(); track photo.side) {
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                [class]="
                  photo.side === side()
                    ? 'bg-white text-slate-900'
                    : 'text-white/80 hover:text-white'
                "
                [attr.aria-pressed]="photo.side === side()"
                (click)="side.set(photo.side)"
              >
                {{ sideKey(photo.side) | transloco }}
              </button>
            }
          </div>
        </div>
      }
    </dialog>
  `,
})
export class PhotoViewer {
  readonly coinId = input.required<number>();
  readonly photos = input.required<CoinPhoto[]>();
  readonly title = input('');
  readonly initialSide = input<CoinSide>();
  /** Share link secret, for photos of unlisted collections. */
  readonly shareToken = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly titleId = `viewer-title-${++nextId}`;

  // The national side identifies a euro coin, so it is shown first unless asked otherwise
  protected readonly side = linkedSignal<CoinSide | undefined>(
    () =>
      this.initialSide() ??
      (this.photos().find((p) => p.side === 'National') ?? this.photos()[0])?.side,
  );
  protected readonly current = computed(
    () => this.photos().find((p) => p.side === this.side()) ?? this.photos()[0],
  );

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly wheel = new WheelGesture();

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      dialog.addEventListener('close', () => this.closed.emit(), { once: true });
      dialog.showModal();
    });
  }

  protected url(photo: CoinPhoto): string {
    return photoUrl(this.coinId(), photo, 'full', this.shareToken());
  }

  protected sideKey(side: CoinSide): string {
    return `coin.side.${side}.label`;
  }

  protected step(delta: number): void {
    const photos = this.photos();
    const index = photos.findIndex((p) => p.side === this.current()?.side);
    const next = photos[(index + delta + photos.length) % photos.length];
    if (next) {
      this.side.set(next.side);
    }
  }

  // One scroll gesture moves one side in COIN_SIDES order without wrapping: down goes from the
  // national to the common side, up goes back (user choice; the arrow keys cycle)
  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = this.wheel.next(event);
    if (delta === 0) {
      return;
    }
    const sides = COIN_SIDES.filter((s) => this.photos().some((p) => p.side === s));
    const next = sides[sides.indexOf(this.current()?.side as CoinSide) + delta];
    if (next) {
      this.side.set(next);
    }
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  // Clicks outside the content (dialog padding or backdrop) close the viewer
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
