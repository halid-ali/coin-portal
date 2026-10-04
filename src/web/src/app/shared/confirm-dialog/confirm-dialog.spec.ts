import { TestBed } from '@angular/core/testing';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { stubModalDialogs } from '../testing/dialogs';
import { ConfirmOptions } from './confirm-dialog';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialog', () => {
  beforeEach(async () => {
    stubModalDialogs();
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  // Dialogs a test leaves open
  afterEach(() => document.querySelectorAll('app-confirm-dialog').forEach((e) => e.remove()));

  /** Opens a dialog; settles with the result, or 'open' while it is still waiting. */
  function open(options: Partial<ConfirmOptions> = {}) {
    let settled: boolean | 'open' = 'open';
    const result = TestBed.inject(ConfirmDialogService)
      .confirm({ title: 'Delete', message: 'For good', danger: true, ...options })
      .then((r) => (settled = r));
    TestBed.tick();
    const host = document.querySelector('app-confirm-dialog')!;
    const dialog = host.querySelector('dialog')!;
    return { host, dialog, result, state: () => settled };
  }

  /** Press and release, as a mouse does: the click goes to the common ancestor of both targets. */
  async function press(down: Element, click: Element): Promise<void> {
    down.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    click.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  }

  it('confirms only once the expected text is typed', async () => {
    const { host, result } = open({ typeToConfirm: { label: 'Type the name:', value: 'alice' } });
    const input = host.querySelector<HTMLInputElement>('input[type=text]')!;
    const confirm = host.querySelector<HTMLButtonElement>('button.btn-danger')!;
    const type = (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      TestBed.tick();
    };
    expect(host.textContent).toContain('Type the name:');
    expect(confirm.disabled).toBe(true);

    type('alic');
    expect(confirm.disabled).toBe(true);
    // Exactly, not ignoring case: user names are told apart that way in the panel
    type('Alice');
    expect(confirm.disabled).toBe(true);
    type(' alice ');
    expect(confirm.disabled).toBe(false);

    confirm.click();
    expect(await result).toBe(true);
  });

  it('focuses the name field and confirms with Enter once it matches', async () => {
    const { host, result, state } = open({ typeToConfirm: { label: 'Name:', value: 'alice' } });
    const input = host.querySelector<HTMLInputElement>('input[type=text]')!;
    expect(input.hasAttribute('autofocus')).toBe(true);
    expect(host.querySelector('button.btn-secondary')!.hasAttribute('autofocus')).toBe(false);

    const enter = () =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    enter();
    await Promise.resolve();
    expect(state()).toBe('open');

    input.value = 'alice';
    input.dispatchEvent(new Event('input'));
    TestBed.tick();
    enter();
    expect(await result).toBe(true);
  });

  it('gives Cancel the focus without a name to type', () => {
    const { host } = open();
    expect(host.querySelector('button.btn-secondary')!.hasAttribute('autofocus')).toBe(true);
  });

  it('closes on a backdrop click only when the press started there too', async () => {
    const { dialog, host, result, state } = open();

    // A text selection that starts in the panel and ends outside it
    await press(host.querySelector('p')!, dialog);
    expect(state()).toBe('open');

    await press(dialog, dialog);
    expect(await result).toBe(false);
  });

  it('does not close on a backdrop click with a text field', async () => {
    const { dialog, state } = open({ note: { label: 'Reason', maxLength: 500 } });
    await press(dialog, dialog);
    expect(state()).toBe('open');
  });

  it('removes its element when closed', async () => {
    const { host, result } = open();
    host.querySelector<HTMLButtonElement>('button.btn-secondary')!.click();
    expect(await result).toBe(false);
    expect(document.querySelector('app-confirm-dialog')).toBeNull();
  });
});
