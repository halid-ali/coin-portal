import { TestBed } from '@angular/core/testing';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { stubModalDialogs } from '../testing/dialogs';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialog', () => {
  beforeEach(async () => {
    stubModalDialogs();
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  afterEach(() => document.querySelectorAll('app-confirm-dialog').forEach((e) => e.remove()));

  it('confirms only once the expected text is typed', async () => {
    const result = TestBed.inject(ConfirmDialogService).confirm({
      title: 'Delete',
      message: 'For good',
      danger: true,
      typeToConfirm: { label: 'Type the name:', value: 'alice' },
    });
    TestBed.tick();

    const dialog = document.querySelector('app-confirm-dialog')!;
    const input = dialog.querySelector<HTMLInputElement>('input[type=text]')!;
    const confirm = dialog.querySelector<HTMLButtonElement>('button.btn-danger')!;
    const type = (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      TestBed.tick();
    };
    expect(dialog.textContent).toContain('Type the name:');
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
});
