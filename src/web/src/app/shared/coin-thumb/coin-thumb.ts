import { Component, computed, input } from '@angular/core';

import { Coin } from '../../core/coins/coin.models';
import { photoUrl, primaryPhoto } from '../../core/coins/coin.service';
import { DenominationIcon } from '../denomination-icon/denomination-icon';
import { OtherCoinIcon } from '../other-coin-icon/other-coin-icon';

/**
 * Round thumbnail of a coin (national side if available), or without photos its stand-in (a euro
 * coin's denomination icon, an other coin's icon in its hue), the coin filling the circle like a
 * photo (no tile around it: the coin is round already).
 * The host sets the size, e.g. class="size-10".
 */
@Component({
  selector: 'app-coin-thumb',
  imports: [DenominationIcon, OtherCoinIcon],
  host: {
    class: 'block shrink-0 overflow-hidden rounded-full',
    '[class.bg-shade-100]': 'src()',
    '[class.ring-1]': 'src()',
    '[class.ring-shade-200]': 'src()',
  },
  template: `
    @if (src(); as url) {
      <img [src]="url" alt="" loading="lazy" decoding="async" class="size-full object-cover" />
    } @else if (coin().denomination; as denomination) {
      <app-denomination-icon tight class="size-full" [denomination]="denomination" />
    } @else {
      <app-other-coin-icon tight class="size-full" [coinId]="coin().id" />
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
