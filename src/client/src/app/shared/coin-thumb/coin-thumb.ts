import { Component, computed, input } from '@angular/core';

import { Coin } from '../../core/coins/coin.models';
import { photoUrl, primaryPhoto } from '../../core/coins/coin.service';

/**
 * Round thumbnail of a coin (national side if available), or a coin placeholder without photos.
 * The host sets the size, e.g. class="size-10".
 */
@Component({
  selector: 'app-coin-thumb',
  host: { class: 'block shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200' },
  template: `
    @if (src(); as url) {
      <img [src]="url" alt="" loading="lazy" decoding="async" class="size-full object-cover" />
    } @else {
      <svg
        viewBox="0 0 24 24"
        class="size-full p-[22%] text-slate-300"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5.5" />
      </svg>
    }
  `,
})
export class CoinThumb {
  readonly coin = input.required<Coin>();

  protected readonly src = computed(() => {
    const coin = this.coin();
    const photo = primaryPhoto(coin);
    return photo ? photoUrl(coin.id, photo, 'thumb') : null;
  });
}
