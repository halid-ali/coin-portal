import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { PasswordField } from './password-field';

@Component({
  imports: [PasswordField],
  template: `
    <app-password-field>
      <input id="password" type="password" class="form-input" />
    </app-password-field>
  `,
})
class Host {}

describe('PasswordField', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      page,
      input: page.querySelector<HTMLInputElement>('#password')!,
      button: page.querySelector<HTMLButtonElement>('button')!,
    };
  }

  /** A key event with the Caps Lock state (jsdom's events do not carry one). */
  function key(type: 'keydown' | 'keyup', capsLock: boolean): KeyboardEvent {
    const event = new KeyboardEvent(type, { key: 'a', bubbles: true });
    Object.defineProperty(event, 'getModifierState', {
      value: (name: string) => name === 'CapsLock' && capsLock,
    });
    return event;
  }

  it('shows and hides the password, the state on the button', async () => {
    const { fixture, input, button } = await render();
    expect(button.getAttribute('aria-label')).toBe('Parolayı göster');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('password');
    expect(button.type).toBe('button'); // never submits the form
    // Room for the button
    expect(input.classList).toContain('pr-11');

    button.click();
    await fixture.whenStable();
    expect(input.type).toBe('text');
    expect(button.getAttribute('aria-pressed')).toBe('true');

    button.click();
    await fixture.whenStable();
    expect(input.type).toBe('password');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('says when Caps Lock is on while typing, until it is off or the field is left', async () => {
    const { fixture, page, input } = await render();
    const note = () => page.querySelector('[aria-live="polite"]')!.textContent!.trim();
    expect(note()).toBe('');

    input.dispatchEvent(key('keydown', true));
    await fixture.whenStable();
    expect(note()).toBe('Caps Lock açık');

    input.dispatchEvent(key('keyup', false));
    await fixture.whenStable();
    expect(note()).toBe('');

    input.dispatchEvent(key('keydown', true));
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await fixture.whenStable();
    expect(note()).toBe('');
  });

  it('ignores keys pressed on the button', async () => {
    const { fixture, page, button } = await render();

    button.dispatchEvent(key('keydown', true));
    await fixture.whenStable();

    expect(page.querySelector('[aria-live="polite"]')!.textContent!.trim()).toBe('');
  });
});
