import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Combobox } from './combobox';
import { ComboboxOption } from './combobox-filter';

const COUNTRIES: ComboboxOption[] = [
  { value: 'BG', label: 'Bulgaristan' },
  { value: 'BI', label: 'Burundi' },
  { value: 'DJ', label: 'Cibuti' },
  { value: 'DE', label: 'Almanya' },
  { value: 'TR', label: 'Türkiye' },
];

@Component({
  imports: [Combobox, ReactiveFormsModule],
  template: `
    <label for="countryCode">Ülke</label>
    <app-combobox
      inputId="countryCode"
      label="Ülke"
      placeholder="Seç…"
      [formControl]="country"
      [options]="countries"
    />
    <button type="button">sonraki</button>
  `,
})
class FormHost {
  readonly countries = COUNTRIES;
  readonly country = new FormControl('', { nonNullable: true, validators: Validators.required });
}

@Component({
  imports: [Combobox],
  template: `
    <app-combobox
      inputId="nominal"
      label="Nominal"
      allLabel="Tümü"
      [options]="options"
      [value]="value()"
      (valueChange)="chosen.push($event)"
    />
  `,
})
class FilterHost {
  readonly options: ComboboxOption[] = [
    { value: 'Euro2', label: '2 €', group: 'Euro coin' },
    { value: 'Cent50', label: '50 cent', group: 'Euro coin' },
    { value: 'currency:penny', label: 'penny', group: 'Diğer coin' },
    { value: 'currency:kopek', label: 'kopek', group: 'Diğer coin' },
  ];
  readonly value = signal('Euro2');
  readonly chosen: string[] = [];
}

@Component({
  imports: [Combobox, ReactiveFormsModule],
  template: `
    <app-combobox
      inputId="currency"
      label="Para birimi"
      freeText
      [formControl]="currency"
      [options]="suggestions()"
      [maxLength]="30"
    />
  `,
})
class FreeTextHost {
  readonly suggestions = signal<ComboboxOption[]>(
    ['kuruş', 'lira', 'penny'].map((c) => ({ value: c, label: c })),
  );
  readonly currency = new FormControl('', { nonNullable: true });
}

describe('Combobox', () => {
  let page: HTMLElement;
  let fixture: ComponentFixture<unknown>;

  async function create<T>(host: new () => T): Promise<ComponentFixture<T>> {
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
    const created = TestBed.createComponent(host);
    fixture = created;
    // Focus needs the elements in the document
    document.body.appendChild(created.nativeElement);
    await created.whenStable();
    page = created.nativeElement as HTMLElement;
    return created;
  }

  afterEach(() => fixture.nativeElement.remove());

  const box = () => page.querySelector<HTMLInputElement>('[role=combobox]')!;
  const listed = () =>
    [...page.querySelectorAll('[role=option]')].map((o) =>
      o.textContent!.replace(/\s+/g, ' ').trim(),
    );
  const active = () =>
    page
      .querySelector(`#${box().getAttribute('aria-activedescendant')}`)
      ?.textContent!.replace(/\s+/g, ' ')
      .trim();
  async function key(name: string): Promise<KeyboardEvent> {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    box().dispatchEvent(event);
    await fixture.whenStable();
    return event;
  }
  async function type(text: string): Promise<void> {
    box().focus();
    box().value = text;
    box().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }
  async function leave(): Promise<void> {
    box().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    await fixture.whenStable();
  }

  describe('in a form', () => {
    let host: FormHost;

    beforeEach(async () => {
      host = (await create(FormHost)).componentInstance;
    });

    it('is a combobox tied to its label and texts, closed at first', () => {
      expect(box().id).toBe('countryCode');
      expect(box().getAttribute('aria-expanded')).toBe('false');
      expect(box().getAttribute('aria-required')).toBe('true');
      expect(box().getAttribute('aria-describedby')).toBe('countryCode-error countryCode-hint');
      expect(box().placeholder).toBe('Seç…');
      expect(page.querySelector('[role=listbox]')).toBeNull();
    });

    it('opens with every option on a click, the list named', async () => {
      box().click();
      await fixture.whenStable();

      expect(box().getAttribute('aria-expanded')).toBe('true');
      const list = page.querySelector('[role=listbox]')!;
      expect(list.getAttribute('aria-label')).toBe('Ülke');
      expect(box().getAttribute('aria-controls')).toBe(list.id);
      expect(listed()).toEqual(['Bulgaristan', 'Burundi', 'Cibuti', 'Almanya', 'Türkiye']);
    });

    it('filters as you type, the best matches first and the first one highlighted', async () => {
      await type('bu');

      expect(listed()).toEqual(['Bulgaristan', 'Burundi', 'Cibuti']);
      expect(active()).toBe('Bulgaristan');
      expect(page.querySelector('[role=option] .font-semibold')?.textContent).toBe('Bu');
    });

    it('picks with the arrow keys and Enter, and shows the name', async () => {
      await type('bu');
      await key('ArrowDown');
      expect(active()).toBe('Burundi');
      await key('ArrowUp');
      await key('ArrowUp');
      expect(active()).toBe('Cibuti');

      const enter = await key('Enter');

      expect(enter.defaultPrevented).toBe(true);
      expect(host.country.value).toBe('DJ');
      expect(box().value).toBe('Cibuti');
      expect(box().getAttribute('aria-expanded')).toBe('false');
    });

    it('leaves Enter to the form while closed', async () => {
      box().focus();
      expect((await key('Enter')).defaultPrevented).toBe(false);
    });

    it('picks with a click', async () => {
      await type('tür');
      page.querySelector<HTMLElement>('[role=option]')!.click();
      await fixture.whenStable();

      expect(host.country.value).toBe('TR');
      expect(box().value).toBe('Türkiye');
    });

    it('opens on the chosen option, marked as selected', async () => {
      host.country.setValue('DE');
      await fixture.whenStable();
      expect(box().value).toBe('Almanya');

      box().focus();
      await key('ArrowDown');

      expect(active()).toBe('Almanya');
      expect(page.querySelector('[aria-selected=true]')?.textContent?.trim()).toBe('Almanya');
    });

    it('brings the choice back on Escape, without passing the key on', async () => {
      host.country.setValue('DE');
      await fixture.whenStable();
      await type('bu');

      const escape = await key('Escape');

      expect(escape.defaultPrevented).toBe(true);
      expect(box().value).toBe('Almanya');
      expect(host.country.value).toBe('DE');
      expect((await key('Escape')).defaultPrevented).toBe(false);
    });

    it('keeps the old choice when left without picking, but takes an exact name', async () => {
      host.country.setValue('DE');
      await fixture.whenStable();
      await type('bu');
      await leave();

      expect(host.country.value).toBe('DE');
      expect(box().value).toBe('Almanya');
      expect(host.country.touched).toBe(true);

      await type('türkiye ');
      await leave();
      expect(host.country.value).toBe('TR');
    });

    it('says when nothing matches', async () => {
      await type('xyz');

      expect(page.querySelector('[role=listbox]')).toBeNull();
      expect(page.querySelector('[role=status]')?.textContent?.trim()).toBe('Eşleşen sonuç yok');
      expect(box().hasAttribute('aria-controls')).toBe(false);
      expect((await key('Enter')).defaultPrevented).toBe(true);
      expect(host.country.value).toBe('');
    });

    it('is invalid once touched and empty', async () => {
      host.country.markAsTouched();
      await fixture.whenStable();

      expect(box().getAttribute('aria-invalid')).toBe('true');
      expect(box().classList).toContain('ng-invalid');
    });

    it('follows the control being disabled', async () => {
      host.country.disable();
      await fixture.whenStable();
      expect(box().disabled).toBe(true);
    });
  });

  describe('as a filter', () => {
    let host: FilterHost;

    beforeEach(async () => {
      host = (await create(FilterHost)).componentInstance;
    });

    describe('the list width', () => {
      const popup = () => box().parentElement!.querySelector<HTMLElement>('div.absolute')!;
      /** jsdom has no layout: the box starts at `left`, the list is `width` wide. */
      function layout(left: number, width: () => number) {
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
          this: HTMLElement,
        ) {
          const x = this.tagName === 'APP-COMBOBOX' ? left : 0;
          const w = this.classList.contains('absolute') ? width() : 0;
          return { left: x, width: w } as DOMRect;
        });
      }

      afterEach(() => vi.restoreAllMocks());

      it('is the longest option, at least the box and at most 24rem, and long names wrap', async () => {
        layout(100, () => 200);
        box().click();
        await fixture.whenStable();

        expect(popup().className).toContain('w-max');
        expect(popup().className).toContain('min-w-full');
        expect(popup().className).toContain('max-w-[min(24rem,calc(100vw-2rem))]');
        expect(popup().classList).toContain('left-0');
        expect(page.querySelector('[role=option] span')!.classList).toContain('wrap-anywhere');
      });

      it('turns to the right edge when it would leave the screen', async () => {
        // jsdom's window is 1024 px wide
        layout(900, () => 200);
        box().click();
        await fixture.whenStable();

        expect(popup().classList).toContain('right-0');
        expect(popup().classList).not.toContain('left-0');
      });

      it('does not shrink while typing narrows it, until it closes', async () => {
        let width = 240;
        layout(100, () => width);
        box().click();
        await fixture.whenStable();
        expect(popup().style.minWidth).toBe('240px');

        width = 120;
        await type('pe');
        expect(popup().style.minWidth).toBe('240px');

        await key('Escape');
        box().click();
        await fixture.whenStable();
        expect(popup().style.minWidth).toBe('120px');
      });
    });

    it('lists "All" on top and the options under their headings', async () => {
      box().click();
      await fixture.whenStable();

      expect(listed()).toEqual(['Tümü', '2 €', '50 cent', 'penny', 'kopek']);
      const groups = [...page.querySelectorAll('[role=group]')];
      expect(
        groups.map((g) =>
          page.querySelector(`#${g.getAttribute('aria-labelledby')}`)?.textContent?.trim(),
        ),
      ).toEqual(['Euro coin', 'Diğer coin']);
      expect(box().hasAttribute('aria-describedby')).toBe(false);
    });

    it('keeps only the matching options and their heading', async () => {
      await type('pe');

      expect(listed()).toEqual(['penny', 'kopek']);
      expect(page.querySelectorAll('[role=group]')).toHaveLength(1);
    });

    it('tells the page the new value, and "All" when the box is emptied', async () => {
      await type('kop');
      await key('Enter');
      expect(host.chosen).toEqual(['currency:kopek']);

      await type('');
      await leave();
      expect(host.chosen).toEqual(['currency:kopek', '']);
      expect(box().value).toBe('Tümü');
    });

    it('shows the value the page gives', async () => {
      expect(box().value).toBe('2 €');
      host.value.set('');
      await fixture.whenStable();
      expect(box().value).toBe('Tümü');
    });
  });

  describe('with free text', () => {
    let host: FreeTextHost;

    beforeEach(async () => {
      host = (await create(FreeTextHost)).componentInstance;
    });

    it('takes any text as typed, the suggestions that match listed', async () => {
      await type('Lir');

      expect(host.currency.value).toBe('Lir');
      expect(listed()).toEqual(['lira']);
      expect(box().getAttribute('maxlength')).toBe('30');

      await type('drahmi');
      expect(host.currency.value).toBe('drahmi');
      // A new currency is no mistake: the list hides
      expect(box().getAttribute('aria-expanded')).toBe('false');
      expect(page.querySelector('[role=status]')).toBeNull();

      await leave();
      expect(host.currency.value).toBe('drahmi');
      expect(box().value).toBe('drahmi');
    });

    it('highlights nothing by itself: Enter keeps the text for the form', async () => {
      await type('l');
      expect(box().hasAttribute('aria-activedescendant')).toBe(false);

      const enter = await key('Enter');

      expect(enter.defaultPrevented).toBe(false);
      expect(host.currency.value).toBe('l');
      expect(box().getAttribute('aria-expanded')).toBe('false');
    });

    it('takes a suggestion with the arrow keys or a click', async () => {
      await type('ku');
      await key('ArrowDown');
      expect(active()).toBe('kuruş');
      await key('Enter');
      expect(host.currency.value).toBe('kuruş');

      await type('p');
      page.querySelector<HTMLElement>('[role=option]')!.click();
      await fixture.whenStable();
      expect(host.currency.value).toBe('penny');
    });

    it('keeps the text on Escape', async () => {
      await type('pen');
      await key('Escape');

      expect(box().value).toBe('pen');
      expect(host.currency.value).toBe('pen');
    });

    it('is a plain text box without suggestions', async () => {
      host.suggestions.set([]);
      await fixture.whenStable();
      expect(page.querySelector('svg')).toBeNull();

      await type('lira');
      expect(box().getAttribute('aria-expanded')).toBe('false');
      expect(host.currency.value).toBe('lira');
    });
  });
});
