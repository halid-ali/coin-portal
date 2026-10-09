import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Coin } from '../../core/coins/coin.models';
import { CoinThumb } from './coin-thumb';

type ThumbCoin = Pick<Coin, 'id' | 'photos' | 'denomination'>;

@Component({
  imports: [CoinThumb],
  template: `<app-coin-thumb class="size-10" [coin]="coin()" shareToken="abc" />`,
})
class Host {
  readonly coin = signal<ThumbCoin>({ id: 7, photos: [], denomination: 'Cent20' });
}

describe('CoinThumb', () => {
  let fixture: ComponentFixture<Host>;
  let thumb: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    thumb = (fixture.nativeElement as HTMLElement).querySelector('app-coin-thumb')!;
  });

  it('shows the denomination icon filling the circle without photos', () => {
    const icon = thumb.querySelector('app-denomination-icon')!;
    expect(icon.querySelector('text')!.textContent).toBe('20c');
    expect(icon.querySelector('svg')!.getAttribute('viewBox')).toBe('1.6 1.6 20.8 20.8');
    expect(icon.className).not.toContain('denomination-tile');
    expect(thumb.querySelector('img')).toBeNull();
    // No frame around the coin: it is round already
    expect(thumb.classList).not.toContain('ring-1');
    expect(thumb.classList).toContain('size-10');
  });

  it('shows an other coin without photos as its icon in its hue', async () => {
    fixture.componentInstance.coin.set({ id: 12, photos: [], denomination: null });
    await fixture.whenStable();

    const icon = thumb.querySelector('app-other-coin-icon')!;
    expect(icon.querySelector('text')!.textContent).toBe('¤');
    expect(icon.querySelector('svg')!.getAttribute('viewBox')).toBe('1.6 1.6 20.8 20.8');
    // Id 12: the fifth hue
    expect(icon.querySelector('circle')!.getAttribute('class')).toContain('fill-rose-300');
    expect(thumb.querySelector('app-denomination-icon')).toBeNull();
  });

  it('shows the national side photo when there is one', async () => {
    fixture.componentInstance.coin.set({
      id: 7,
      denomination: 'Cent20',
      photos: [
        { side: 'Common', id: '00000000-0000-0000-0000-000000000002' },
        { side: 'National', id: '00000000-0000-0000-0000-000000000001' },
      ],
    });
    await fixture.whenStable();

    const src = thumb.querySelector('img')!.getAttribute('src')!;
    expect(src).toContain('00000000-0000-0000-0000-000000000001');
    expect(src).toContain('s=abc');
    expect(thumb.querySelector('app-denomination-icon')).toBeNull();
    expect(thumb.classList).toContain('ring-1');
    expect(thumb.classList).toContain('size-10');
  });
});
