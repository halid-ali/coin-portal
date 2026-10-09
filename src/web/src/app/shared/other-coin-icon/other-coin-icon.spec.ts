import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OTHER_COIN_HUES, OtherCoinIcon, otherCoinHue } from './other-coin-icon';

@Component({
  imports: [OtherCoinIcon],
  template: `
    <app-other-coin-icon id="plain" [coinId]="coinId()" />
    <app-other-coin-icon id="tile" tile [coinId]="coinId()" />
    <app-other-coin-icon id="tight" tight [coinId]="coinId()" />
  `,
})
class Host {
  readonly coinId = signal(9);
}

describe('OtherCoinIcon', () => {
  let fixture: ComponentFixture<Host>;
  const icon = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`#${id}`)!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  it('gives each coin one of eight hues by its id, the same every time', () => {
    expect(OTHER_COIN_HUES).toEqual([
      'sky',
      'indigo',
      'violet',
      'fuchsia',
      'rose',
      'teal',
      'emerald',
      'lime',
    ]);
    expect([0, 1, 7, 8, 9, 15].map(otherCoinHue)).toEqual([
      'sky',
      'indigo',
      'lime',
      'sky',
      'indigo',
      'lime',
    ]);
  });

  it('draws the coin with the currency sign in its hue', () => {
    const svg = icon('plain').querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.querySelector('text')!.textContent).toBe('¤');
    expect(svg.querySelector('circle')!.getAttribute('class')).toContain('fill-indigo-300');
    expect(icon('plain').getAttribute('aria-hidden')).toBe('true');
    expect(icon('plain').className).not.toContain('denomination-tile');
  });

  it('puts a tint of the hue behind it as a tile, and fills a thumbnail when tight', () => {
    expect(icon('tile').classList).toContain('denomination-tile');
    expect(icon('tile').classList).toContain('other-coin');
    expect(icon('tile').classList).toContain('other-coin-indigo');
    expect(icon('tight').querySelector('svg')!.getAttribute('viewBox')).toBe('1.6 1.6 20.8 20.8');
  });

  it('follows another coin', async () => {
    fixture.componentInstance.coinId.set(4);
    await fixture.whenStable();

    expect(icon('tile').classList).toContain('other-coin-rose');
    expect(icon('plain').querySelector('circle')!.getAttribute('class')).toContain('fill-rose-300');
  });
});
