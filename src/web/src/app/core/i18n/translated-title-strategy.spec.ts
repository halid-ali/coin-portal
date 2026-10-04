import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { provideTestTransloco, useTestLanguage } from './testing';
import { TranslatedTitleStrategy } from './translated-title-strategy';

@Component({ template: '' })
class Page {}

describe('TranslatedTitleStrategy', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestTransloco(),
        provideRouter([
          { path: 'login', title: 'titles.login', component: Page },
          { path: 'untitled', component: Page },
        ]),
        { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
      ],
    });
    await useTestLanguage('tr');
  });

  const title = () => TestBed.inject(Title).getTitle();

  it('translates the route title and follows a language switch', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');
    expect(title()).toBe('Giriş yap · CoinVitrine');

    await useTestLanguage('en');

    expect(title()).toBe('Sign in · CoinVitrine');
  });

  it('shows only the site name for routes without a title', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/untitled');

    expect(title()).toBe('CoinVitrine');
  });

  it("keeps a title the page set itself (e.g. a collection's name) on a language switch", async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');
    TestBed.inject(Title).setTitle('Koleksiyonum · CoinVitrine');

    await useTestLanguage('en');

    expect(title()).toBe('Koleksiyonum · CoinVitrine');
  });
});
