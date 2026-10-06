import { Component, booleanAttribute, computed, input } from '@angular/core';

import { Denomination } from '../../core/coins/coin.models';

/** The coin's alloy: copper-plated steel (1–5 cent), Nordic gold (10–50 cent), or two metals (1 €, 2 €). */
export type DenominationMetal = 'copper' | 'gold' | 'bimetal';

interface MetalColors {
  fill: string;
  edge: string;
  ink: string;
}

// Fixed colors, the same in both themes (user choice 2026-10-06: the real metals on light and dark
// surfaces alike); only the tile behind follows the theme. Full class names, so Tailwind finds them.
const COPPER: MetalColors = {
  fill: 'fill-orange-400',
  edge: 'stroke-orange-700',
  ink: 'fill-orange-950',
};
const GOLD: MetalColors = {
  fill: 'fill-amber-400',
  edge: 'stroke-amber-700',
  ink: 'fill-amber-950',
};
const SILVER: MetalColors = {
  fill: 'fill-slate-200',
  edge: 'stroke-slate-500',
  ink: 'fill-slate-800',
};

interface CoinDrawing {
  label: string;
  metal: DenominationMetal;
  /** One metal: the coin; two metals: the outer ring. */
  outer: MetalColors;
  /** Two metals only: the inner disc. */
  inner?: MetalColors;
  /** The 20 cent's edge has seven notches ("Spanish flower"). */
  notched?: boolean;
}

const DRAWINGS: Record<Denomination, CoinDrawing> = {
  Cent1: { label: '1c', metal: 'copper', outer: COPPER },
  Cent2: { label: '2c', metal: 'copper', outer: COPPER },
  Cent5: { label: '5c', metal: 'copper', outer: COPPER },
  Cent10: { label: '10c', metal: 'gold', outer: GOLD },
  Cent20: { label: '20c', metal: 'gold', outer: GOLD, notched: true },
  Cent50: { label: '50c', metal: 'gold', outer: GOLD },
  Euro1: { label: '1€', metal: 'bimetal', outer: GOLD, inner: SILVER },
  Euro2: { label: '2€', metal: 'bimetal', outer: SILVER, inner: GOLD },
};

export function denominationMetal(denomination: Denomination): DenominationMetal {
  return DRAWINGS[denomination].metal;
}

// Geometry in a 24 x 24 view box: the coin has radius 10, a two-metal coin's inner disc 6.4
const RADIUS = 10;
const INNER_RADIUS = 6.4;
const round = (n: number) => +n.toFixed(3);
const point = (r: number, angle: number) =>
  `${round(12 + Math.cos(angle) * r)} ${round(12 + Math.sin(angle) * r)}`;

/**
 * The 20 cent's outline: a circle with seven inward scallops, each an arc of a small circle
 * centred on the rim, about 1 mm deep and 2 mm wide on the 22.25 mm coin.
 */
function notchedOutline(r: number): string {
  const notch = 0.9;
  const cut = 2 * Math.asin(notch / (2 * r));
  let d = '';
  for (let i = 0; i < 7; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 7;
    d += i === 0 ? `M${point(r, angle - cut)}` : `A${r} ${r} 0 0 1 ${point(r, angle - cut)}`;
    d += `A${notch} ${notch} 0 0 0 ${point(r, angle + cut)}`;
  }
  return `${d}A${r} ${r} 0 0 1 ${point(r, -Math.PI / 2 - cut)}Z`;
}

/**
 * The dotted ring's dash pattern, fitted to its circumference: a whole number of dots about 1.7
 * apart, so the pattern closes evenly where the circle starts (3 o'clock) instead of leaving two
 * dots side by side.
 */
function dotPattern(r: number): string {
  const length = 2 * Math.PI * r;
  const step = length / Math.round(length / 1.7);
  return `0.1 ${round(step - 0.1)}`;
}

const NOTCHED_OUTLINE = notchedOutline(RADIUS);
// The coin with its rim (half of the 0.75 stroke outside the radius), nothing around it
const TIGHT_VIEW_BOX = '1.6 1.6 20.8 20.8';
const DOTS = { r: 8, pattern: dotPattern(8) };
const NOTCHED_DOTS = { r: 7.4, pattern: dotPattern(7.4) };

/**
 * Stand-in for a euro coin without a photo: its denomination drawn as the coin, in the color of its
 * metal (copper, Nordic gold, or the two metals of 1 € and 2 €). The host sets the size; the drawing
 * fills it (`tight`: the coin itself fills it). With `tile`, the host also gets a theme-aware tint of the metal as its background
 * (`denomination-tile`, styles.css); add `denomination-tile-outlined` for a hairline border.
 */
@Component({
  selector: 'app-denomination-icon',
  host: { class: 'block', 'aria-hidden': 'true', '[class]': 'tileClass()' },
  template: `
    @let coin = drawing();
    <svg [attr.viewBox]="tight() ? tightViewBox : '0 0 24 24'" class="block size-full">
      @if (coin.inner; as inner) {
        <circle
          cx="12"
          cy="12"
          [attr.r]="radius"
          [class]="coin.outer.fill + ' ' + coin.outer.edge"
          stroke-width="0.75"
        />
        <circle
          cx="12"
          cy="12"
          [attr.r]="innerRadius"
          [class]="inner.fill + ' ' + inner.edge"
          stroke-width="0.75"
        />
      } @else {
        @if (coin.notched) {
          <path
            [attr.d]="notchedOutline"
            [class]="coin.outer.fill + ' ' + coin.outer.edge"
            stroke-width="0.75"
            stroke-linejoin="round"
          />
        } @else {
          <circle
            cx="12"
            cy="12"
            [attr.r]="radius"
            [class]="coin.outer.fill + ' ' + coin.outer.edge"
            stroke-width="0.75"
          />
        }
        <circle
          cx="12"
          cy="12"
          [attr.r]="dots().r"
          fill="none"
          [class]="coin.outer.edge"
          stroke-width="0.7"
          stroke-linecap="round"
          [attr.stroke-dasharray]="dots().pattern"
        />
      }
      <!-- textContent, not interpolation: spaces around the label would shift the centred text -->
      <text
        x="12"
        y="14.3"
        text-anchor="middle"
        font-size="6.4"
        font-weight="600"
        [class]="(coin.inner ?? coin.outer).ink"
        [textContent]="coin.label"
      ></text>
    </svg>
  `,
})
export class DenominationIcon {
  readonly denomination = input.required<Denomination>();
  readonly tile = input(false, { transform: booleanAttribute });
  /** Crops the margin around the coin, so it fills the host (a round thumbnail, like a photo). */
  readonly tight = input(false, { transform: booleanAttribute });

  protected readonly radius = RADIUS;
  protected readonly innerRadius = INNER_RADIUS;
  protected readonly notchedOutline = NOTCHED_OUTLINE;
  protected readonly tightViewBox = TIGHT_VIEW_BOX;

  protected readonly drawing = computed(() => DRAWINGS[this.denomination()]);
  protected readonly dots = computed(() => (this.drawing().notched ? NOTCHED_DOTS : DOTS));
  protected readonly tileClass = computed(() =>
    this.tile() ? `denomination-tile denomination-${this.drawing().metal}` : '',
  );
}
