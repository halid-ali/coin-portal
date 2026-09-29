import { Component } from '@angular/core';

/**
 * Stand-in picture for a coin without photos: a coin seen at an angle with a reeded edge and a
 * euro sign on its face. Drawn in currentColor; the host sets the size and color. The edge ridges
 * sit at equal angles around the cylinder (15° apart), so they bunch up towards the sides.
 */
@Component({
  selector: 'app-coin-placeholder',
  host: { class: 'block', 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 256 256"
      class="block size-full"
      fill="none"
      stroke="currentColor"
      stroke-width="12"
      stroke-linejoin="round"
    >
      <ellipse cx="128" cy="104" rx="104" ry="48" />
      <path d="M24 104v48a104 48 0 0 0 208 0v-48" />
      <path
        stroke-width="6"
        d="M218.1 134v36M201.5 143.9v36M180 151.6v36M154.9 156.4v36M128 158v36M101.1 156.4v36M76 151.6v36M54.5 143.9v36M37.9 134v36"
      />
      <g stroke-linecap="round">
        <path stroke-width="8" d="M155.1 89.9A30 19 0 1 0 155.1 118.1" />
        <path stroke-width="6" d="M99 99H142M99 109H137" />
      </g>
    </svg>
  `,
})
export class CoinPlaceholder {}
