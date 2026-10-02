import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Contact } from './contact';
import { Privacy } from './privacy';
import { Terms } from './terms';

describe('Legal pages', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  async function render<T>(component: Type<T>): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(component);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows every section of the privacy policy, all of it translated', async () => {
    const page = await render(Privacy);

    expect(page.querySelectorAll('h2').length).toBe(10);
    expect(page.querySelectorAll('li').length).toBe(9);
    expect(page.textContent).toContain('Son güncelleme: 2 Ekim 2026');
    // A key would be shown as is when its text is missing
    expect(page.textContent).not.toMatch(/privacy\.\w+/);
    // The operator is not filled in yet
    expect(page.textContent).toContain('veri sorumlusu): yayından önce eklenecek');
  });

  it('shows every section of the terms of use, all of it translated', async () => {
    const page = await render(Terms);

    expect(page.querySelectorAll('h2').length).toBe(8);
    expect(page.querySelectorAll('li').length).toBe(5);
    expect(page.textContent).toContain('Son güncelleme: 2 Ekim 2026');
    // A key would be shown as is when its text is missing
    expect(page.textContent).not.toMatch(/terms\.\w+/);
  });

  it('names the operator, the e-mail and the source code', async () => {
    const page = await render(Contact);

    expect(page.textContent).toContain('yayından önce eklenecek');
    const source = page.querySelector<HTMLAnchorElement>('a[target=_blank]')!;
    expect(source.href).toBe('https://github.com/halid-ali/coin-portal');
    expect(source.rel).toBe('noopener');
  });
});
