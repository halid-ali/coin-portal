import { Component, computed, input } from '@angular/core';

import { Coin } from '../../core/coins/coin.models';
import { photoUrl, primaryPhoto } from '../../core/coins/coin.service';
import { CoinPlaceholder } from '../coin-placeholder/coin-placeholder';

/**
 * Round thumbnail of a coin (national side if available), or a coin placeholder without photos.
 * The host sets the size, e.g. class="size-10".
 */
@Component({
  selector: 'app-coin-thumb',
  imports: [CoinPlaceholder],
  host: { class: 'block shrink-0 overflow-hidden rounded-full bg-shade-100 ring-1 ring-shade-200' },
  template: `
    @if (src(); as url) {
      <img [src]="url" alt="" loading="lazy" decoding="async" class="size-full object-cover" />
    } @else {
      <app-coin-placeholder class="size-full p-[14%] text-shade-400" />
    }
  `,
})
export class CoinThumb {
  readonly coin = input.required<Pick<Coin, 'id' | 'photos'>>();
  /** Share link secret, for photos of unlisted collections. */
  readonly shareToken = input<string | null>(null);

  protected readonly src = computed(() => {
    const coin = this.coin();
    const photo = primaryPhoto(coin);
    return photo ? photoUrl(coin.id, photo, 'thumb', this.shareToken()) : null;
  });
}
