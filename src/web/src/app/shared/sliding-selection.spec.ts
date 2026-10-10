import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlidingSelection } from './sliding-selection';

@Component({
  imports: [SlidingSelection],
  template: `
    <div [appSlidingSelection]="value()" [highlightClass]="color()" role="group">
      @for (v of values; track v.name) {
        <button
          type="button"
          [attr.data-left]="v.left"
          [attr.data-width]="v.width"
          [attr.aria-pressed]="v.name === value()"
        >
          {{ v.name }}
        </button>
      }
    </div>
  `,
})
class Host {
  readonly values = [
    { name: 'Tümü', left: 2, width: 90 },
    { name: 'Euro', left: 92, width: 76 },
    { name: 'Dünya', left: 168, width: 88 },
  ];
  readonly value = signal('Tümü');
  readonly color = signal('bg-brand-100');
}

@Component({
  imports: [SlidingSelection],
  template: `
    <div [appSlidingSelection]="value()" highlightClass="bg-brand-100" chosen="[data-chosen=true]">
      @for (v of kinds; track v) {
        <label [attr.data-left]="v === 'Euro' ? 2 : 93" [attr.data-chosen]="v === value()">
          <input type="radio" name="kind" [checked]="v === value()" />
          {{ v }}
        </label>
      }
    </div>
  `,
})
class RadioHost {
  readonly kinds = ['Euro', 'Other'];
  readonly value = signal('Euro');
}

// jsdom has no layout: the buttons tell their place through data attributes
const LAYOUT = { offsetLeft: 'left', offsetWidth: 'width' } as const;
const originals = Object.keys(LAYOUT).map(
  (name) => [name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)!] as const,
);

describe('SlidingSelection', () => {
  let fixture: ComponentFixture<Host>;

  beforeAll(() => {
    for (const [name, data] of Object.entries(LAYOUT)) {
      Object.defineProperty(HTMLElement.prototype, name, {
        configurable: true,
        get(this: HTMLElement) {
          return Number(this.dataset[data] ?? 0);
        },
      });
    }
  });

  afterAll(() => {
    for (const [name, descriptor] of originals) {
      Object.defineProperty(HTMLElement.prototype, name, descriptor);
    }
  });

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  const highlight = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[role=group] > span[aria-hidden=true]',
    )!;

  it('puts one highlight behind the chosen button, hidden from screen readers', () => {
    expect(highlight()).not.toBeNull();
    expect(highlight().classList).toContain('absolute');
    expect(highlight().classList).toContain('bg-brand-100');
    // Slides only where the system allows motion
    expect(highlight().classList).toContain('motion-safe:duration-200');
    expect(highlight().style.transform).toBe('translate(2px, 0px)');
    expect(highlight().style.width).toBe('90px');
    // The group is the highlight's frame
    expect(highlight().parentElement!.classList).toContain('relative');
  });

  it('moves to the next choice', async () => {
    fixture.componentInstance.value.set('Dünya');
    await fixture.whenStable();

    expect(highlight().style.transform).toBe('translate(168px, 0px)');
    expect(highlight().style.width).toBe('88px');
    expect(highlight().style.visibility).toBe('');
  });

  it('hides when no button is chosen, and takes another color', async () => {
    fixture.componentInstance.value.set('none');
    fixture.componentInstance.color.set('bg-shade-100');
    await fixture.whenStable();

    expect(highlight().style.visibility).toBe('hidden');
    expect(highlight().classList).toContain('bg-shade-100');
    expect(highlight().classList).not.toContain('bg-brand-100');
  });

  it('finds the chosen item by another selector (radio labels)', async () => {
    const radios = TestBed.createComponent(RadioHost);
    await radios.whenStable();
    const radioHighlight = () =>
      (radios.nativeElement as HTMLElement).querySelector<HTMLElement>('span[aria-hidden=true]')!;
    expect(radioHighlight().style.transform).toBe('translate(2px, 0px)');

    radios.componentInstance.value.set('Other');
    await radios.whenStable();
    expect(radioHighlight().style.transform).toBe('translate(93px, 0px)');
  });
});
