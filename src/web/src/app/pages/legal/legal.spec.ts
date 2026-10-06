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
    expect(page.querySelectorAll('li').length).toBe(11);
    expect(page.textContent).toContain('Son güncelleme: 6 Ekim 2026');
    // A key would be shown as is when its text is missing
    expect(page.textContent).not.toMatch(/privacy\.\w+/);
    expect(page.textContent).toContain(
      'veri sorumlusu): Halid Ali. İletişim: contact@coinvitrine.com.',
    );
  });

  it('shows every section of the terms of use, all of it translated', async () => {
    const page = await render(Terms);

    expect(page.querySelectorAll('h2').length).toBe(8);
    expect(page.querySelectorAll('li').length).toBe(5);
    expect(page.textContent).toContain('Son güncelleme: 5 Ekim 2026');
    // A key would be shown as is when its text is missing
    expect(page.textContent).not.toMatch(/terms\.\w+/);
  });

  it('names the operator, the e-mail and the source code', async () => {
    const page = await render(Contact);

    expect(page.textContent).toContain('Halid Ali');
    const email = page.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')!;
    expect(email.href).toBe('mailto:contact@coinvitrine.com');
    const source = page.querySelector<HTMLAnchorElement>('a[target=_blank]')!;
    expect(source.href).toBe('https://github.com/halid-ali/coin-portal');
    expect(source.rel).toBe('noopener');
    // Tests run in development mode, like ng serve: no licenses file, so no link to it
    expect(page.querySelector('a[href="/3rdpartylicenses.txt"]')).toBeNull();
  });
});
