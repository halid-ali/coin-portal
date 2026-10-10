import { Component } from '@angular/core';

/**
 * The CoinVitrine logo: a coin with a euro sign drawn in round-capped strokes. Colors come from
 * --logo-coin and --logo-sign (styles.css): a dark coin with a gold sign on the light theme, a gold
 * coin with a dark sign on the dark one. Decorative (the name is next to it); the host sets the
 * size. The shell in index.html (until Angular starts) has a copy of this drawing: change both together.
 */
@Component({
  selector: 'app-logo',
  host: { class: 'block', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="2 2 60 60" class="block size-full">
      <circle cx="32" cy="32" r="30" style="fill: var(--logo-coin)" />
      <path
        d="M41.83 22.19A13.2 13.2 0 1 0 41.83 41.81M16 27.7H30.5M16 36.3H30.5"
        fill="none"
        stroke-width="4.8"
        stroke-linecap="round"
        style="stroke: var(--logo-sign)"
      />
    </svg>
  `,
})
export class Logo {}
