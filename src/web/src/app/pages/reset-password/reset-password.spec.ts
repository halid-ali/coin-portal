import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { UserResponse } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Login } from '../login/login';
import { ResetPassword } from './reset-password';

@Component({ template: '' })
class Blank {}

const USER: UserResponse = {
  id: '1',
  userName: 'ayse.yilmaz',
  email: 'ayse@example.com',
  emailConfirmed: true,
  unverifiedMaxCoins: null,
  unverifiedDeletionDueUtc: null,
  firstName: 'Ayşe',
  lastName: 'Yılmaz',
  birthDate: '1990-01-01',
  language: null,
  theme: null,
  accent: null,
  previousSignInAtUtc: null,
  roles: [],
};

describe('ResetPassword', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'reset-password', component: ResetPassword },
            { path: 'login', component: Login },
            { path: 'forgot-password', component: Blank },
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

  function type(id: string, value: string): void {
    const input = page().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  /** Opens the link and answers the check with the account. */
  async function open(): Promise<void> {
    await harness.navigateByUrl('/reset-password?token=abc-123');
    const check = http.expectOne({ method: 'POST', url: '/api/auth/reset-password/check' });
    expect(check.request.body).toEqual({ token: 'abc-123' });
    check.flush({ userName: 'ayse.yilmaz' });
    await harness.fixture.whenStable();
  }

  function save(): void {
    page().querySelector<HTMLButtonElement>('button[type=submit]')!.click();
  }

  it('checks the link, takes the token out of the address and shows the account', async () => {
    await harness.navigateByUrl('/reset-password?token=abc-123');
    expect(page().querySelector('[role="status"]')).not.toBeNull();
    http.expectOne('/api/auth/reset-password/check').flush({ userName: 'ayse.yilmaz' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/reset-password');
    expect(page().querySelector('strong')!.textContent).toContain('ayse.yilmaz');
    expect(page().querySelector('#newPassword')).not.toBeNull();
  });

  it('sets the password and leads to the sign-in, which says so and fills in the username', async () => {
    await open();
    type('newPassword', 'Newpass456');
    type('confirmPassword', 'Newpass456');
    save();

    const reset = http.expectOne({ method: 'POST', url: '/api/auth/reset-password' });
    expect(reset.request.body).toEqual({ token: 'abc-123', newPassword: 'Newpass456' });
    reset.flush(null, { status: 204, statusText: 'No Content' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(page().querySelector('[role="status"]')!.textContent).toContain('Parolan değişti');
    expect(page().querySelector<HTMLInputElement>('#userNameOrEmail')!.value).toBe('ayse.yilmaz');
  });

  it('signs out a user signed in here: the sessions ended with the new password', async () => {
    const auth = TestBed.inject(AuthService);
    const loaded = auth.loadMe();
    http.expectOne('/api/auth/me').flush(USER);
    await loaded;

    await open();
    type('newPassword', 'Newpass456');
    type('confirmPassword', 'Newpass456');
    save();
    http
      .expectOne('/api/auth/reset-password')
      .flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/auth/logout').flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/antiforgery').flush(null);
    await harness.fixture.whenStable();

    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('checks the password rules and the repeat before sending', async () => {
    await open();
    type('newPassword', 'newpass456');
    type('confirmPassword', 'other');
    save();
    await harness.fixture.whenStable();

    http.expectNone('/api/auth/reset-password');
    expect(page().querySelector('#newPassword-error')).not.toBeNull();
    expect(page().querySelector('#confirmPassword-error')).not.toBeNull();
    expect(document.activeElement).toBe(page().querySelector('#newPassword'));
  });

  it("shows the API's password rule on the field", async () => {
    await open();
    type('newPassword', 'Newpass456');
    type('confirmPassword', 'Newpass456');
    save();
    http
      .expectOne('/api/auth/reset-password')
      .flush(
        { status: 400, errors: { PasswordRequiresNonAlphanumeric: ['Needs a symbol.'] } },
        { status: 400, statusText: 'Bad Request' },
      );
    await harness.fixture.whenStable();

    expect(page().querySelector('#newPassword-error')).not.toBeNull();
    // Never the API's English text
    expect(page().textContent).not.toContain('Needs a symbol.');
  });

  it('says when the link no longer works, on opening or on saving', async () => {
    await harness.navigateByUrl('/reset-password?token=old');
    http
      .expectOne('/api/auth/reset-password/check')
      .flush({ code: 'invalid_token' }, { status: 400, statusText: 'Bad Request' });
    await harness.fixture.whenStable();

    expect(page().querySelector('h1')!.textContent).toContain('Link geçersiz');
    expect(page().querySelector('a[href="/forgot-password"]')).not.toBeNull();
    expect(page().querySelector('a[href="/login"]')!.textContent).toContain('Giriş sayfasına dön');

    // Used in another tab while this one was open
    await harness.navigateByUrl('/login');
    await open();
    type('newPassword', 'Newpass456');
    type('confirmPassword', 'Newpass456');
    save();
    http
      .expectOne('/api/auth/reset-password')
      .flush({ code: 'invalid_token' }, { status: 400, statusText: 'Bad Request' });
    await harness.fixture.whenStable();

    expect(page().querySelector('h1')!.textContent).toContain('Link geçersiz');
  });

  it('needs a token', async () => {
    await harness.navigateByUrl('/reset-password');

    http.expectNone('/api/auth/reset-password/check');
    expect(page().querySelector('h1')!.textContent).toContain('Link geçersiz');
  });
});
