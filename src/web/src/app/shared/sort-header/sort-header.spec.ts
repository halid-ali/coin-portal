import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { translate } from '@jsverse/transloco';

import { SortDirection } from '../../core/coins/coin.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { SortHeader } from './sort-header';

@Component({
  imports: [SortHeader],
  template: `<table>
    <thead>
      <tr>
        <th
          appSortHeader
          [label]="label()"
          [fullLabel]="fullLabel()"
          [direction]="direction()"
          [firstDirection]="firstDirection()"
          [clearable]="clearable()"
          (toggle)="toggles = toggles + 1"
        ></th>
      </tr>
    </thead>
  </table>`,
})
class Host {
  readonly label = signal('Yıl');
  readonly fullLabel = signal<string | null>(null);
  readonly direction = signal<SortDirection | null>(null);
  readonly firstDirection = signal<SortDirection>('Asc');
  readonly clearable = signal(true);
  toggles = 0;
}

describe('SortHeader', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  async function render(
    direction: SortDirection | null,
    options: { firstDirection?: SortDirection; clearable?: boolean } = {},
  ) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.direction.set(direction);
    fixture.componentInstance.firstDirection.set(options.firstDirection ?? 'Asc');
    fixture.componentInstance.clearable.set(options.clearable ?? true);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      th: page.querySelector('th')!,
      button: page.querySelector('button')!,
    };
  }

  // aria-sort for screen readers; the tooltip says what the next click does
  it.each([
    [null, {}, null, 'sort.ascending'],
    [null, { firstDirection: 'Desc' as const }, null, 'sort.descending'],
    ['Asc' as const, {}, 'ascending', 'sort.descending'],
    ['Desc' as const, {}, 'descending', 'sort.clear'],
    ['Desc' as const, { clearable: false }, 'descending', 'sort.ascending'],
  ])('sorted %s (%o): aria-sort %s, tooltip %s', async (direction, options, ariaSort, hint) => {
    const { th, button } = await render(direction, options);

    expect(th.getAttribute('aria-sort')).toBe(ariaSort);
    expect(th.getAttribute('scope')).toBe('col');
    expect(button.title).toBe(translate(hint));
  });

  it('reads a shortened label out in full', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.label.set('Год.');
    fixture.componentInstance.fullLabel.set('Година');
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(button.querySelector('[aria-hidden=true]')!.textContent).toBe('Год.');
    expect(button.querySelector('.sr-only')!.textContent).toBe('Година');

    // The same text twice would be read twice
    fixture.componentInstance.label.set('Година');
    await fixture.whenStable();
    expect(button.querySelector('.sr-only')).toBeNull();
  });

  it('reports a click to the parent, which sorts', async () => {
    const { fixture, button } = await render(null);

    button.click();

    expect(fixture.componentInstance.toggles).toBe(1);
    expect(button.textContent).toContain('Yıl');
  });
});
