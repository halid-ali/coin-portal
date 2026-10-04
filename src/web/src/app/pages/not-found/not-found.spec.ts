import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { TranslatedTitleStrategy } from '../../core/i18n/translated-title-strategy';

@Component({ template: '' })
class Home {}

describe('NotFound', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        // The app's own catch-all route, behind a stand-in home page
        provideRouter([{ path: '', pathMatch: 'full', component: Home }, routes.at(-1)!]),
        { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
      ],
    });
    await useTestLanguage('tr');
    harness = await RouterTestingHarness.create();
  });

  const robots = () => document.head.querySelector('meta[name="robots"]');

  it('shows an unknown address as not found instead of the home page', async () => {
    await harness.navigateByUrl('/s/abc/extra');

    expect(TestBed.inject(Router).url).toBe('/s/abc/extra');
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toBe('Sayfa bulunamadı');
    expect(TestBed.inject(Title).getTitle()).toBe('Sayfa bulunamadı · CoinVitrine');
    expect(robots()?.getAttribute('content')).toBe('noindex');
  });

  it('lets search engines index again after leaving it', async () => {
    await harness.navigateByUrl('/nope');
    await harness.navigateByUrl('/');

    expect(robots()).toBeNull();
  });
});
