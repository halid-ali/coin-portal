import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { App } from './app';
import { provideTestTransloco, useTestLanguage } from './core/i18n/testing';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
      ],
    }).compileComponents();
    await useTestLanguage('tr');
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show login and register links for anonymous visitors', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Giriş yap');
    expect(text).toContain('Kayıt ol');
  });

  it('follows a language switch', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    await useTestLanguage('de');
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Anmelden');
    expect(text).toContain('Registrieren');
    expect(text).not.toContain('Giriş yap');
  });
});

@Component({ template: '<p>page</p>' })
class Page {}

describe('App page changes', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Page },
          { path: 'other', component: Page },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
      ],
    });
    await useTestLanguage('tr');
  });

  async function start() {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    return { fixture, router, page, main: page.querySelector('main')! };
  }

  it('moves focus into a new page, not when only the query changes', async () => {
    const { fixture, router, main } = await start();
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    expect(document.activeElement).not.toBe(main);

    await router.navigateByUrl('/?page=2');
    await fixture.whenStable();
    expect(document.activeElement).not.toBe(main);
    expect(scroll).not.toHaveBeenCalled();

    await router.navigateByUrl('/other');
    await fixture.whenStable();
    expect(document.activeElement).toBe(main);
    expect(scroll).toHaveBeenCalledWith({ top: 0 });
  });

  it('has a skip link that focuses the content', async () => {
    const { page, main } = await start();
    const skip = page.querySelector<HTMLAnchorElement>('a[href="#main"]')!;
    expect(skip.textContent).toContain('İçeriğe atla');

    skip.click();
    expect(document.activeElement).toBe(main);
    expect(location.hash).toBe('');
  });
});
