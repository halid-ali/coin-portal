import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Login } from '../login/login';
import { ForgotPassword } from './forgot-password';

describe('ForgotPassword', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'login', component: Login },
            { path: 'forgot-password', component: ForgotPassword },
          ],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
      ],
    });
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement!;
  const input = () => page().querySelector<HTMLInputElement>('#userNameOrEmail')!;

  function type(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input'));
  }

  it('takes what was typed on the sign-in page along', async () => {
    await harness.navigateByUrl('/login');
    page().querySelector<HTMLInputElement>('#userNameOrEmail')!.value = 'ayse@example.com';
    page().querySelector('#userNameOrEmail')!.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    page().querySelector<HTMLAnchorElement>('a[href="/forgot-password"]')!.click();
    await harness.fixture.whenStable();

    expect(page().querySelector('h1')!.textContent).toContain('Parolanı mı unuttun?');
    expect(input().value).toBe('ayse@example.com');
  });

  it('asks for the link in the current language, then says the same for every account', async () => {
    await harness.navigateByUrl('/forgot-password');
    expect(input().value).toBe('');
    type('  ayse.yilmaz ');
    page().querySelector<HTMLButtonElement>('button[type=submit]')!.click();

    const request = http.expectOne({ method: 'POST', url: '/api/auth/forgot-password' });
    expect(request.request.body).toEqual({ userNameOrEmail: 'ayse.yilmaz', language: 'tr' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await harness.fixture.whenStable();

    const heading = page().querySelector('h1')!;
    expect(heading.textContent).toContain('E-postanı kontrol et');
    // The form is gone: the focus is on what replaced it
    expect(document.activeElement).toBe(heading);
    expect(page().querySelector('a[href="/login"]')!.textContent).toContain('Giriş sayfasına dön');
  });

  it('goes back to the form with the value kept', async () => {
    await harness.navigateByUrl('/forgot-password');
    type('ayse.yilmaz');
    page().querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    http
      .expectOne('/api/auth/forgot-password')
      .flush(null, { status: 204, statusText: 'No Content' });
    await harness.fixture.whenStable();

    page().querySelector<HTMLButtonElement>('button[type=button]')!.click();
    await harness.fixture.whenStable();

    expect(input().value).toBe('ayse.yilmaz');
    expect(document.activeElement).toBe(input());
  });

  it('needs the field', async () => {
    await harness.navigateByUrl('/forgot-password');
    type('   ');
    page().querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await harness.fixture.whenStable();

    http.expectNone('/api/auth/forgot-password');
    expect(page().querySelector('#userNameOrEmail-error')).not.toBeNull();
    expect(document.activeElement).toBe(input());
  });

  it('says when it was asked too often', async () => {
    await harness.navigateByUrl('/forgot-password');
    type('ayse.yilmaz');
    page().querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    http
      .expectOne('/api/auth/forgot-password')
      .flush({ code: 'rate_limited' }, { status: 429, statusText: 'Too Many Requests' });
    await harness.fixture.whenStable();

    expect(page().querySelector('[role="alert"]')).not.toBeNull();
    // Still the form: nothing was sent
    expect(input()).not.toBeNull();
  });
});
