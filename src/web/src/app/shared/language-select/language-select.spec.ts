import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Language } from '../../core/i18n/languages';
import { LanguageSelect } from './language-select';

@Component({
  imports: [LanguageSelect],
  template: `<app-language-select
    label="Dil"
    [value]="value()"
    (valueChange)="chosen.push($event)"
  />`,
})
class Host {
  readonly value = signal<Language>('tr');
  readonly chosen: Language[] = [];
}

/** The listbox pattern: works with the keyboard alone (order: en, de, tr, bg). */
describe('LanguageSelect', () => {
  let fixture: ComponentFixture<Host>;
  let page: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    // Focus needs the elements in the document
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    page = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => fixture.nativeElement.remove());

  const button = () => page.querySelector<HTMLButtonElement>('button')!;
  const list = () => page.querySelector<HTMLElement>('[role=listbox]');
  const activeOption = () =>
    page.querySelector(`#${list()!.getAttribute('aria-activedescendant')}`)?.getAttribute('lang');
  async function key(target: HTMLElement, name: string): Promise<void> {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    await fixture.whenStable();
  }

  it('names the button with the label and the current language', () => {
    expect(button().getAttribute('aria-label')).toBe('Dil: Türkçe');
    expect(button().getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on the current language and takes the focus', async () => {
    await key(button(), 'ArrowDown');

    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(list());
    expect(activeOption()).toBe('tr');
    expect(page.querySelector('[aria-selected=true]')?.getAttribute('lang')).toBe('tr');
  });

  it('moves with the arrow keys, around the ends, and with Home and End', async () => {
    await key(button(), 'ArrowDown');

    await key(list()!, 'ArrowDown');
    expect(activeOption()).toBe('bg');
    await key(list()!, 'ArrowDown');
    expect(activeOption()).toBe('en');
    await key(list()!, 'ArrowUp');
    expect(activeOption()).toBe('bg');
    await key(list()!, 'Home');
    expect(activeOption()).toBe('en');
    await key(list()!, 'End');
    expect(activeOption()).toBe('bg');
  });

  it('picks with Enter and gives the focus back to the button', async () => {
    await key(button(), 'ArrowDown');
    await key(list()!, 'ArrowUp');

    await key(list()!, 'Enter');

    expect(fixture.componentInstance.chosen).toEqual(['de']);
    expect(list()).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  it('closes on Escape without a change', async () => {
    await key(button(), 'ArrowDown');
    await key(list()!, 'ArrowDown');

    await key(list()!, 'Escape');

    expect(fixture.componentInstance.chosen).toEqual([]);
    expect(list()).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  it('does not report choosing the language already shown', async () => {
    await key(button(), 'ArrowDown');
    await key(list()!, ' ');

    expect(fixture.componentInstance.chosen).toEqual([]);
  });
});
