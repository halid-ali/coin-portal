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
 * Up to this many characters and lines a description stays under the photo on a wide screen too
 * (user choice 2026-10-10: a short one left the column beside the photo empty); longer ones get it.
 */
const SHORT_DESCRIPTION_MAX = 200;
const SHORT_DESCRIPTION_LINES = 3;

/**
 * Fullscreen view of a coin's photos (largest size) in a modal <dialog>, with a switch
 * between the national and common side (buttons, arrow keys or the mouse wheel). Render it with
 * @if and remove it on (closed), like the other dialogs. Given the denomination, a missing common
 * side photo is shown as the denomination icon: the common side is the same in every country and
 * shows the value. An other coin (`kind`) names its sides front and back and has no such side.
 * The coin's description (user choices 2026-10-10, up to 2000 characters): a long one from lg up
 * beside the photo in a column of its own that scrolls, the viewer wider; a short one, and any on a
 * narrower screen, under the photo, the whole viewer scrolling when it is too tall. The wheel
 * scrolls the text there, it switches the sides over the photo.
 */
@Component({
  selector: 'app-photo-viewer',
  imports: [ImageSkeleton, TranslocoPipe, DenominationIcon],
  template: `
    <!-- The dimmed screen is the dialog itself, not its ::backdrop: accessibility checks (axe) see
     the dark ground under the white text, the ::backdrop they cannot see -->
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="m-0 size-full max-h-none max-w-none overflow-y-auto bg-slate-950/85 text-white
             backdrop-blur-sm backdrop:bg-transparent"
      (pointerdown)="pressedOnBackdrop = isBackdrop($event.target)"
      (click)="onDialogClick($event)"
      (keydown.arrowleft)="step(-1)"
      (keydown.arrowright)="step(1)"
      (wheel)="onWheel($event)"
    >
      <div #frame class="flex min-h-full items-center justify-center p-4">
        <div class="w-full" [class]="contentWidth()">
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

          <!-- A long description from lg up: the photo and its text side by side, the text as tall as
           the photo (on a ground like the photo's, user choice 2026-10-10), the side buttons under
           the photo -->
          <div [class]="beside() ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-6' : ''">
            <div class="min-w-0 lg:col-start-1 lg:row-start-1">
              @if (current(); as shown) {
                @if (shown.photo; as photo) {
                  <img
                    appImageSkeleton
                    [src]="url(photo)"
                    [alt]="title() + ' – ' + (sideKey(photo.side) | transloco)"
                    class="mx-auto aspect-square w-full rounded-xl bg-slate-800 object-contain"
                    [class]="photoSize()"
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
                    class="mx-auto grid aspect-square w-full place-items-center rounded-xl bg-slate-800"
                    [class]="photoSize()"
                  >
                    <app-denomination-icon class="aspect-square h-3/5" [denomination]="value" />
                  </div>
                }
              }
            </div>

            @if (sides().length > 1) {
              <div class="mt-3 flex justify-center lg:col-start-1 lg:row-start-2">
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
            @if (description(); as text) {
              <div class="lg:relative lg:col-start-2 lg:row-start-1">
                <!-- A region of its own: focusable, so the keyboard scrolls it too; textContent keeps the
         line breaks without the template's own whitespace -->
                <div
                  #descriptionPanel
                  tabindex="0"
                  role="region"
                  [attr.aria-label]="'coin.field.description' | transloco"
                  class="mt-4 rounded-md text-sm leading-6 whitespace-pre-line wrap-break-word text-white/85
                 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
                  [class]="
                    beside()
                      ? 'lg:absolute lg:inset-0 lg:mt-0 lg:overflow-y-auto lg:rounded-xl lg:bg-slate-800 lg:py-4 lg:pr-3 lg:pl-5'
                      : ''
                  "
                  [textContent]="text"
                ></div>
              </div>
            }
          </div>
        </div>
      </div>
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
  /** The coin's own words, beside or under the photo. */
  readonly description = input<string | null>(null);

  /** A long description: beside the photo from lg up, the viewer wider. */
  protected readonly beside = computed(() => {
    const text = this.description();
    return (
      !!text &&
      (text.length > SHORT_DESCRIPTION_MAX || text.split('\n').length > SHORT_DESCRIPTION_LINES)
    );
  });
  /**
   * The photo box is a square as wide as the screen's height allows (no bands beside the photo); a
   * short description under it takes three lines of that, so it all fits.
   */
  protected readonly photoSize = computed(() =>
    this.description() && !this.beside()
      ? 'max-w-[calc(100dvh-14.5rem)]'
      : 'max-w-[calc(100dvh-9rem)]',
  );
  /**
   * As wide as the photo (and the text column beside it): the title and the close button line up
   * with them.
   */
  protected readonly contentWidth = computed(() =>
    this.beside()
      ? 'max-w-[min(72rem,calc(100dvh+14.5rem))]'
      : this.description()
        ? 'max-w-[min(48rem,calc(100dvh-14.5rem))]'
        : 'max-w-[min(48rem,calc(100dvh-9rem))]',
  );
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
  private readonly descriptionPanel = viewChild<ElementRef<HTMLElement>>('descriptionPanel');
  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
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
    // The description scrolls, and so does a viewer taller than the screen (with it, on a phone)
    const dialog = this.dialog().nativeElement;
    if (
      this.descriptionPanel()?.nativeElement.contains(event.target as Node) ||
      dialog.scrollHeight > dialog.clientHeight
    ) {
      return;
    }
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

  // Clicks outside the content (on the dimmed screen) close the viewer, when the press
  // started there too (not a drag that ends outside the photo)
  protected onDialogClick(event: MouseEvent): void {
    if (this.isBackdrop(event.target) && this.pressedOnBackdrop) {
      this.close();
    }
  }

  /** The dimmed screen around the content. */
  protected isBackdrop(target: EventTarget | null): boolean {
    return target === this.dialog().nativeElement || target === this.frame().nativeElement;
  }
}
