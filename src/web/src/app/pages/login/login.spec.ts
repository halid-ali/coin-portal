import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { translate } from '@jsverse/transloco';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Login } from './login';

const alice = {
  id: '1',
  userName: 'ayse.yilmaz',
  email: 'ayse@example.com',
  firstName: 'Ayşe',
  lastName: 'Yılmaz',
  birthDate: '1990-01-01',
  language: null,
  theme: null,
  accent: null,
  previousSignInAtUtc: null,
  roles: [],
};

describe('Login', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
      ],
    }).compileComponents();
    await useTestLanguage('tr');
  });

  it('remembers the sign-in unless the user unchecks it', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const checkbox = page.querySelector<HTMLInputElement>('input[type=checkbox]')!;
    expect(checkbox.checked).toBe(true);

    const type = (name: string, value: string) => {
      const input = page.querySelector<HTMLInputElement>(`[formControlName=${name}]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('userNameOrEmail', 'ayse.yilmaz');
    type('password', 'Coinportal1');
    page.querySelector<HTMLButtonElement>('button[type=submit]')!.click();

    const request = TestBed.inject(HttpTestingController).expectOne('/api/auth/login');
    expect(request.request.body).toEqual({
      userNameOrEmail: 'ayse.yilmaz',
      password: 'Coinportal1',
      rememberMe: true,
    });
  });

  /** Fills in and sends the form; returns the page and the pending sign-in request. */
  async function signIn(returnUrl?: string) {
    const fixture = TestBed.createComponent(Login);
    if (returnUrl !== undefined) {
      fixture.componentRef.setInput('returnUrl', returnUrl);
    }
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const type = (name: string, value: string) => {
      const input = page.querySelector<HTMLInputElement>(`[formControlName=${name}]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('userNameOrEmail', 'ayse.yilmaz');
    type('password', 'Coinportal1');
    page.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    const http = TestBed.inject(HttpTestingController);
    return { fixture, page, http, request: http.expectOne('/api/auth/login') };
  }

  // A locked account with the right password: by an admin (coded) or after failed attempts
  it.each([
    [401, null, 'login.invalidCredentials'],
    [423, { code: 'account_locked' }, 'login.accountLocked'],
    [423, { title: 'Account temporarily locked.' }, 'login.lockedOut'],
    [400, null, 'errors.requestRejected'],
    [429, { code: 'rate_limited' }, 'errors.rateLimited'],
    [0, null, 'errors.network'],
  ])('explains a %i response (%o) and clears the password', async (status, body, key) => {
    const { fixture, page, request } = await signIn();

    request.flush(body, { status, statusText: 'Error' });
    await fixture.whenStable();

    expect(page.querySelector('[role=alert]')?.textContent?.trim()).toBe(translate(key));
    expect(page.querySelector<HTMLInputElement>('[formControlName=password]')!.value).toBe('');
  });

  it.each([
    ['/collections/5?view=grid', '/collections/5?view=grid'],
    ['//evil.example', '/'],
    ['https://evil.example', '/'],
    [undefined, '/'],
  ])('goes to %s after signing in only inside the site (%s)', async (returnUrl, expected) => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { fixture, http, request } = await signIn(returnUrl);

    request.flush(alice);
    await fixture.whenStable();
    http.expectOne('/api/auth/antiforgery').flush(null);
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(expected);
  });
});
