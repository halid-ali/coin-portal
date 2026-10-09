import { Component, booleanAttribute, computed, input } from '@angular/core';

/** The hues of other coins, in this order (coin id modulo 8; user choice 2026-10-09). */
export const OTHER_COIN_HUES = [
  'sky',
  'indigo',
  'violet',
  'fuchsia',
  'rose',
  'teal',
  'emerald',
  'lime',
] as const;

export type OtherCoinHue = (typeof OTHER_COIN_HUES)[number];

interface HueColors {
  fill: string;
  edge: string;
  ink: string;
}

// Fixed colors, the same in both themes like the euro metals; only the tile behind follows the
// theme. No amber, yellow, orange or gray: those are the euro coins' gold, copper and silver.
// Full class names, so Tailwind finds them.
const COLORS: Record<OtherCoinHue, HueColors> = {
  sky: { fill: 'fill-sky-300', edge: 'stroke-sky-700', ink: 'fill-sky-950' },
  indigo: { fill: 'fill-indigo-300', edge: 'stroke-indigo-700', ink: 'fill-indigo-950' },
  violet: { fill: 'fill-violet-300', edge: 'stroke-violet-700', ink: 'fill-violet-950' },
  fuchsia: { fill: 'fill-fuchsia-300', edge: 'stroke-fuchsia-700', ink: 'fill-fuchsia-950' },
  rose: { fill: 'fill-rose-300', edge: 'stroke-rose-700', ink: 'fill-rose-950' },
  teal: { fill: 'fill-teal-300', edge: 'stroke-teal-700', ink: 'fill-teal-950' },
  emerald: { fill: 'fill-emerald-300', edge: 'stroke-emerald-700', ink: 'fill-emerald-950' },
  lime: { fill: 'fill-lime-300', edge: 'stroke-lime-700', ink: 'fill-lime-950' },
};

/** A coin keeps its hue everywhere (list, grid, form) and across reloads. */
export function otherCoinHue(coinId: number): OtherCoinHue {
  const index =
    ((coinId % OTHER_COIN_HUES.length) + OTHER_COIN_HUES.length) % OTHER_COIN_HUES.length;
  return OTHER_COIN_HUES[index];
}

/**
 * Stand-in for a coin other than a euro coin without a photo: the euro denomination icon's format
 * (filled coin, edge, dotted ring) with the generic currency sign ¤ on every coin, in the coin's
 * hue (otherCoinHue). The host sets the size; `tight` crops the margin so the coin fills the host
 * (a round thumbnail), `tile` adds a theme-aware tint of the hue behind it (`denomination-tile`
 * with `other-coin other-coin-<hue>`, styles.css).
 */
@Component({
  selector: 'app-other-coin-icon',
  host: { class: 'block', 'aria-hidden': 'true', '[class]': 'tileClass()' },
  template: `
    @let c = colors();
    <svg [attr.viewBox]="tight() ? '1.6 1.6 20.8 20.8' : '0 0 24 24'" class="block size-full">
      <circle cx="12" cy="12" r="10" [class]="c.fill + ' ' + c.edge" stroke-width="0.75" />
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        [class]="c.edge"
        stroke-width="0.7"
        stroke-linecap="round"
        stroke-dasharray="0.1 1.576"
      />
      <text
        x="12"
        y="15.5"
        text-anchor="middle"
        font-size="10"
        font-weight="600"
        [class]="c.ink"
        [textContent]="'¤'"
      ></text>
    </svg>
  `,
})
export class OtherCoinIcon {
  readonly coinId = input.required<number>();
  readonly tile = input(false, { transform: booleanAttribute });
  readonly tight = input(false, { transform: booleanAttribute });

  protected readonly hue = computed(() => otherCoinHue(this.coinId()));
  protected readonly colors = computed(() => COLORS[this.hue()]);
  protected readonly tileClass = computed(() =>
    this.tile() ? `denomination-tile other-coin other-coin-${this.hue()}` : '',
  );
}
