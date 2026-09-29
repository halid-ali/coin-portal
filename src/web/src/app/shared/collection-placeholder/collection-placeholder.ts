import { Component } from '@angular/core';

let nextId = 0;

/**
 * Stand-in picture for a collection without an uploaded cover: two coins stacked and a third one
 * leaning against them. Every coin is the coin placeholder (CoinPlaceholder) scaled as a whole, so
 * the lines keep its proportions; the leaning coin's euro sign is squeezed sideways like its face.
 * Drawn in currentColor; the host sets the size and color.
 */
@Component({
  selector: 'app-collection-placeholder',
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
      <!-- Hides the stack behind the leaning coin. The id is unique per copy: url(#…) resolves
           to the first matching id in the page -->
      <mask [attr.id]="maskId" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
        <rect width="256" height="256" fill="#fff" stroke="none" />
        <g transform="translate(192 118) rotate(-28) scale(0.577)" fill="#000" stroke="#000">
          <ellipse cx="0" cy="0" rx="48" ry="104" />
          <path d="M0 -104h-48a48 104 0 0 0 0 208h48z" />
        </g>
      </mask>
      <g [attr.mask]="'url(#' + maskId + ')'">
        <g transform="translate(94 102.5) scale(0.577)">
          <ellipse cx="0" cy="0" rx="104" ry="48" />
          <path d="M-104 0v96a104 48 0 0 0 208 0v-96" />
          <path d="M-104 48a104 48 0 0 0 208 0" />
          <path
            stroke-width="6"
            d="M90.1 30v36M73.5 39.9v36M52 47.6v36M26.9 52.4v36M0 54v36M-26.9 52.4v36M-52 47.6v36M-73.5 39.9v36M-90.1 30v36M90.1 78v36M73.5 87.9v36M52 95.6v36M26.9 100.4v36M0 102v36M-26.9 100.4v36M-52 95.6v36M-73.5 87.9v36M-90.1 78v36"
          />
          <g stroke-linecap="round">
            <path stroke-width="8" d="M27.1 -14.1A30 19 0 1 0 27.1 14.1" />
            <path stroke-width="6" d="M-29 -5H14M-29 5H9" />
          </g>
        </g>
      </g>
      <g transform="translate(192 118) rotate(-28) scale(0.577)">
        <ellipse cx="0" cy="0" rx="48" ry="104" />
        <path d="M0 -104h-48a48 104 0 0 0 0 208h48" />
        <path
          stroke-width="6"
          d="M-30 -90.1h-36M-39.9 -73.5h-36M-47.6 -52h-36M-52.4 -26.9h-36M-54 0h-36M-52.4 26.9h-36M-47.6 52h-36M-39.9 73.5h-36M-30 90.1h-36"
        />
        <g stroke-linecap="round">
          <path stroke-width="10" d="M17.4 -31.2A19.3 42 0 1 0 17.4 31.2" />
          <path stroke-width="7.5" d="M-18.7 -11.1H9M-18.7 11.1H5.8" />
        </g>
      </g>
    </svg>
  `,
})
export class CollectionPlaceholder {
  protected readonly maskId = `collection-placeholder-cut-${nextId++}`;
}
