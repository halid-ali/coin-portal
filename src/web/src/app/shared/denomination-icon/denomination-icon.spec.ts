import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DENOMINATIONS, Denomination } from '../../core/coins/coin.models';
import { DenominationIcon, denominationMetal } from './denomination-icon';

@Component({
  imports: [DenominationIcon],
  template: `<app-denomination-icon [denomination]="denomination()" [tile]="tile()" />`,
})
class Host {
  readonly denomination = signal<Denomination>('Cent10');
  readonly tile = signal(false);
}

describe('DenominationIcon', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    host = (fixture.nativeElement as HTMLElement).querySelector('app-denomination-icon')!;
  });

  async function show(denomination: Denomination, tile = false): Promise<void> {
    fixture.componentInstance.denomination.set(denomination);
    fixture.componentInstance.tile.set(tile);
    await fixture.whenStable();
  }

  const label = () => host.querySelector('text')!.textContent;
  const dotRing = () => host.querySelector('circle[stroke-dasharray]');

  it('writes the value on the coin, without spaces around it', async () => {
    const labels: Record<Denomination, string> = {
      Euro2: '2€',
      Euro1: '1€',
      Cent50: '50c',
      Cent20: '20c',
      Cent10: '10c',
      Cent5: '5c',
      Cent2: '2c',
      Cent1: '1c',
    };
    for (const d of DENOMINATIONS) {
      await show(d);
      expect(label()).toBe(labels[d]);
    }
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });

  it('colors each coin by its metal', async () => {
    await show('Cent2');
    expect(host.querySelector('circle')!.getAttribute('class')).toContain('fill-orange-400');
    await show('Cent50');
    expect(host.querySelector('circle')!.getAttribute('class')).toContain('fill-amber-400');

    // 1 €: gold ring, silver centre; 2 €: the other way round, the value on the centre
    await show('Euro1');
    let [ring, centre] = Array.from(host.querySelectorAll('circle'));
    expect(ring.getAttribute('class')).toContain('fill-amber-400');
    expect(centre.getAttribute('class')).toContain('fill-slate-200');
    expect(host.querySelector('text')!.getAttribute('class')).toContain('fill-slate-800');
    expect(dotRing()).toBeNull();

    await show('Euro2');
    [ring, centre] = Array.from(host.querySelectorAll('circle'));
    expect(ring.getAttribute('class')).toContain('fill-slate-200');
    expect(centre.getAttribute('class')).toContain('fill-amber-400');
    expect(denominationMetal('Euro2')).toBe('bimetal');
  });

  it('draws the 20 cent with seven notches', async () => {
    await show('Cent20');
    const outline = host.querySelector('path')!.getAttribute('d')!;
    expect(outline.match(/A0\.9 0\.9/g)).toHaveLength(7);

    await show('Cent10');
    expect(host.querySelector('path')).toBeNull();
  });

  it('spaces the dots evenly: the pattern repeats a whole number of times around the ring', async () => {
    for (const d of ['Cent1', 'Cent20'] as const) {
      await show(d);
      const ring = dotRing()!;
      const r = Number(ring.getAttribute('r'));
      const [dash, gap] = ring.getAttribute('stroke-dasharray')!.split(' ').map(Number);
      const turns = (2 * Math.PI * r) / (dash + gap);
      expect(Math.abs(turns - Math.round(turns))).toBeLessThan(0.01);
    }
  });

  it('keeps a margin around the coin unless asked to fill the host', async () => {
    expect(host.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('puts the tile of its metal behind it only when asked', async () => {
    await show('Cent5');
    expect(host.className).not.toContain('denomination-tile');

    await show('Cent5', true);
    expect(host.classList).toContain('denomination-tile');
    expect(host.classList).toContain('denomination-copper');

    await show('Euro1', true);
    expect(host.classList).toContain('denomination-bimetal');
    expect(host.classList).not.toContain('denomination-copper');
  });
});
