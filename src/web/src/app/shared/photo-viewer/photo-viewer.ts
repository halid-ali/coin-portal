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

import {
  COIN_SIDES,
  CoinKind,
  CoinPhoto,
  CoinSide,
  Denomination,
} from '../../core/coins/coin.models';
import { photoUrl } from '../../core/coins/coin.service';
import { sideLabelKey } from '../coin-format';
import { DenominationIcon } from '../denomination-icon/denomination-icon';
import { WheelGesture } from './wheel-gesture';
import { ImageSkeleton } from '../image-skeleton';

/** One side in the viewer: its photo, or none (a common side shown as the denomination icon). */
interface ViewerSide {
  side: CoinSide;
  photo: CoinPhoto | null;
}

let nextId = 0;

/**
 * Fullscreen view of a coin's photos (largest size) in a modal <dialog>, with a switch
 * between the national and common side (buttons, arrow keys or the mouse wheel). Render it with
 * @if and remove it on (closed), like the other dialogs. Given the denomination, a missing common
 * side photo is shown as the denomination icon: the common side is the same in every country and
 * shows the value. An other coin (`kind`) names its sides front and back and has no such side.
 */
@Component({
  selector: 'app-photo-viewer',
  imports: [ImageSkeleton, TranslocoPipe, DenominationIcon],
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="m-auto max-h-dvh w-full max-w-3xl bg-transparent p-4 text-white backdrop:bg-slate-950/85
             backdrop:backdrop-blur-sm"
      (pointerdown)="pressedOnBackdrop = $event.target === dialog"
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

      @if (current(); as shown) {
        @if (shown.photo; as photo) {
          <img
            appImageSkeleton
            [src]="url(photo)"
            [alt]="title() + ' – ' + (sideKey(photo.side) | transloco)"
            class="mx-auto aspect-square max-h-[calc(100dvh-9rem)] w-full rounded-xl bg-slate-800 object-contain"
          />
        } @else if (denomination(); as value) {
          <div
            role="img"
            [attr.aria-label]="
              title() +
              ' – ' +
              (sideKey(shown.side) | transloco) +
              ' (' +
              ('viewer.noPhoto' | transloco) +
              ')'
            "
            class="mx-auto grid aspect-square max-h-[calc(100dvh-9rem)] w-full place-items-center rounded-xl bg-slate-800"
          >
            <app-denomination-icon class="aspect-square h-3/5" [denomination]="value" />
          </div>
        }
      }

      @if (sides().length > 1) {
        <div class="mt-3 flex justify-center">
          <div
            class="inline-flex rounded-lg bg-white/10 p-1"
            role="group"
            [attr.aria-label]="'viewer.sides' | transloco"
          >
            @for (item of sides(); track item.side) {
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                [class]="
                  item.side === current()?.side
                    ? 'bg-white text-slate-900'
                    : 'text-white/80 hover:text-white'
                "
                [attr.aria-pressed]="item.side === current()?.side"
                (click)="side.set(item.side)"
              >
                {{ sideKey(item.side) | transloco }}
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
  /** Names the sides: national / common (euro) or front / back (other). */
  readonly kind = input<CoinKind>('Euro');
  /** Shows a missing common side as the denomination icon (euro coins only). */
  readonly denomination = input<Denomination | null>();
  /** Share link secret, for photos of unlisted collections. */
  readonly shareToken = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly titleId = `viewer-title-${++nextId}`;

  // In COIN_SIDES order; the common side without a photo only with the denomination to draw
  protected readonly sides = computed<ViewerSide[]>(() =>
    COIN_SIDES.flatMap((side) => {
      const photo = this.photos().find((p) => p.side === side) ?? null;
      return photo || (side === 'Common' && this.denomination()) ? [{ side, photo }] : [];
    }),
  );

  // The national side identifies a euro coin, so it is shown first unless asked otherwise
  protected readonly side = linkedSignal<CoinSide | undefined>(
    () => this.initialSide() ?? this.sides().find((s) => s.photo)?.side,
  );
  protected readonly current = computed<ViewerSide | undefined>(
    () => this.sides().find((s) => s.side === this.side()) ?? this.sides()[0],
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
    return sideLabelKey(this.kind(), side);
  }

  protected step(delta: number): void {
    const sides = this.sides();
    const index = sides.findIndex((s) => s.side === this.current()?.side);
    const next = sides[(index + delta + sides.length) % sides.length];
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
    const sides = this.sides();
    const next = sides[sides.findIndex((s) => s.side === this.current()?.side) + delta];
    if (next) {
      this.side.set(next.side);
    }
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected pressedOnBackdrop = false;

  // Clicks outside the content (dialog padding or backdrop) close the viewer, when the press
  // started there too (not a drag that ends outside the photo)
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement && this.pressedOnBackdrop) {
      this.close();
    }
  }
}
