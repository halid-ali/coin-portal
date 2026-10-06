import { Component, computed, input } from '@angular/core';

import { Coin } from '../../core/coins/coin.models';
import { photoUrl, primaryPhoto } from '../../core/coins/coin.service';
import { DenominationIcon } from '../denomination-icon/denomination-icon';

/**
 * Round thumbnail of a coin (national side if available), or without photos its denomination icon,
 * the coin filling the circle like a photo (no tile around it: the coin is round already).
 * The host sets the size, e.g. class="size-10".
 */
@Component({
  selector: 'app-coin-thumb',
  imports: [DenominationIcon],
  host: {
    class: 'block shrink-0 overflow-hidden rounded-full',
    '[class.bg-shade-100]': 'src()',
    '[class.ring-1]': 'src()',
    '[class.ring-shade-200]': 'src()',
  },
  template: `
    @if (src(); as url) {
      <img [src]="url" alt="" loading="lazy" decoding="async" class="size-full object-cover" />
    } @else {
      <app-denomination-icon tight class="size-full" [denomination]="coin().denomination" />
    }
  `,
})
export class CoinThumb {
  readonly coin = input.required<Pick<Coin, 'id' | 'photos' | 'denomination'>>();
  /** Share link secret, for photos of unlisted collections. */
  readonly shareToken = input<string | null>(null);

  protected readonly src = computed(() => {
    const coin = this.coin();
    const photo = primaryPhoto(coin);
    return photo ? photoUrl(coin.id, photo, 'thumb', this.shareToken()) : null;
  });
}
