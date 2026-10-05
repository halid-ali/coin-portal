import { Component, input } from '@angular/core';

/**
 * A euro coin drawn in thin lines (the home page's album): a two-metal coin (1 €, 2 €) has an inner
 * ring, a cent coin a dotted rim; the value in the middle. Drawn in currentColor; the host sets
 * the size.
 */
@Component({
  selector: 'app-line-coin',
  host: { class: 'block', 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 24 24"
      class="block size-full"
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      @if (twoMetals()) {
        <circle cx="12" cy="12" r="6.4" />
      } @else {
        <circle cx="12" cy="12" r="8.2" stroke-width="0.7" stroke-dasharray="0.1 1.6" />
      }
      <text
        x="12"
        y="14.3"
        text-anchor="middle"
        font-size="6.4"
        font-weight="600"
        fill="currentColor"
        stroke="none"
      >
        {{ value() }}
      </text>
    </svg>
  `,
})
export class LineCoin {
  /** Short value shown in the middle, e.g. "2€", "50c". */
  readonly value = input.required<string>();
  readonly twoMetals = input(false);
}
