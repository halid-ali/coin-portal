import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { provideTestTransloco, useTestLanguage } from '../core/i18n/testing';
import { stubModalDialogs } from './testing/dialogs';
import { DISCARD_CHANGES_STATE, HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes';

@Component({ template: '' })
class Form implements HasUnsavedChanges {
  readonly dirty = signal(false);
  hasUnsavedChanges(): boolean {
    return this.dirty();
  }
}

@Component({ template: '' })
class Other {}

describe('unsavedChangesGuard', () => {
  let harness: RouterTestingHarness;
  let form: Form;

  beforeEach(async () => {
    stubModalDialogs();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'form', component: Form, canDeactivate: [unsavedChangesGuard] },
          { path: 'other', component: Other },
        ]),
        provideTestTransloco(),
      ],
    });
    await useTestLanguage('tr');
    harness = await RouterTestingHarness.create();
    form = await harness.navigateByUrl('/form', Form);
  });

  afterEach(() => document.querySelectorAll('app-confirm-dialog').forEach((e) => e.remove()));

  const router = () => TestBed.inject(Router);

  /**
   * Starts leaving the form; resolves once the question is shown (or the navigation ended). The
   * navigation is wrapped: an async function would otherwise wait for it.
   */
  async function leave(state?: Record<string, unknown>) {
    const navigation = router().navigateByUrl('/other', { state });
    // Not whenStable(): the pending navigation waits for the answer
    await vi.waitFor(() => {
      TestBed.tick();
      expect(
        document.querySelector('app-confirm-dialog') || router().url === '/other',
      ).toBeTruthy();
    });
    return { navigation };
  }

  function answer(text: string): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('app-confirm-dialog button');
    [...buttons].find((b) => b.textContent!.includes(text))!.click();
  }

  it('leaves without a question when nothing changed', async () => {
    expect(await (await leave()).navigation).toBe(true);
    expect(document.querySelector('app-confirm-dialog')).toBeNull();
  });

  it('asks first and stays when the user keeps editing', async () => {
    form.dirty.set(true);
    const { navigation } = await leave();
    expect(document.querySelector('app-confirm-dialog')!.textContent).toContain(
      'Kaydedilmemiş değişiklikler',
    );

    answer('Düzenlemeye devam et');
    expect(await navigation).toBe(false);
    expect(router().url).toBe('/form');
  });

  it('leaves when the user discards the changes', async () => {
    form.dirty.set(true);
    const { navigation } = await leave();

    answer('Kaydetmeden çık');
    expect(await navigation).toBe(true);
    expect(router().url).toBe('/other');
  });

  it('does not ask for the Cancel link', async () => {
    form.dirty.set(true);
    expect(await (await leave(DISCARD_CHANGES_STATE)).navigation).toBe(true);
    expect(document.querySelector('app-confirm-dialog')).toBeNull();
  });
});
