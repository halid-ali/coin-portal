import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { UserResponse } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { VerifyEmail } from './verify-email';

@Component({ template: '' })
class Blank {}

const USER: UserResponse = {
  id: '1',
  userName: 'alice',
  email: 'alice@example.com',
  emailConfirmed: false,
  unverifiedMaxCoins: 20,
  unverifiedDeletionDueUtc: null,
  firstName: 'Alice',
  lastName: 'Smith',
  birthDate: '1990-01-01',
  language: null,
  theme: null,
  accent: null,
  previousSignInAtUtc: null,
  roles: [],
};

describe('VerifyEmail', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'verify-email', component: VerifyEmail },
            { path: 'login', component: Blank },
            { path: 'collections', component: Blank },
            { path: '', component: Blank },
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

  it('confirms the address with the token and takes the token out of the address', async () => {
    await harness.navigateByUrl('/verify-email?token=abc-123');
    const request = http.expectOne({ method: 'POST', url: '/api/auth/verify-email' });
    expect(request.request.body).toEqual({ token: 'abc-123' });
    expect(page().querySelector('[role="status"]')).not.toBeNull();

    request.flush(null);
    await harness.fixture.whenStable();

    expect(page().querySelector('h1')!.textContent).toContain('doğrulandı');
    // Signed out: the way on is signing in
    expect(page().querySelector('a[href="/login"]')).not.toBeNull();
    expect(TestBed.inject(Router).url).toBe('/verify-email');
  });

  it('reloads a signed-in user, so the notice above the page goes away', async () => {
    const auth = TestBed.inject(AuthService);
    const loaded = auth.loadMe();
    http.expectOne('/api/auth/me').flush(USER);
    await loaded;

    await harness.navigateByUrl('/verify-email?token=abc');
    http.expectOne('/api/auth/verify-email').flush(null);
    http.expectOne('/api/auth/me').flush({ ...USER, emailConfirmed: true });
    await harness.fixture.whenStable();

    expect(auth.currentUser()!.emailConfirmed).toBe(true);
    expect(page().querySelector('a[href="/collections"]')).not.toBeNull();
  });

  it('says when the link is invalid or expired', async () => {
    await harness.navigateByUrl('/verify-email?token=old');
    http
      .expectOne('/api/auth/verify-email')
      .flush({ code: 'invalid_token' }, { status: 400, statusText: 'Bad Request' });
    await harness.fixture.whenStable();

    expect(page().querySelector('h1')!.textContent).toContain('geçersiz');
  });

  it('without a token, says the link is invalid without asking the API', async () => {
    await harness.navigateByUrl('/verify-email');
    http.expectNone('/api/auth/verify-email');

    expect(page().querySelector('h1')!.textContent).toContain('geçersiz');
  });

  it('says what else went wrong', async () => {
    await harness.navigateByUrl('/verify-email?token=abc');
    http
      .expectOne('/api/auth/verify-email')
      .flush(null, { status: 429, statusText: 'Too Many Requests' });
    await harness.fixture.whenStable();

    expect(page().querySelector('h1')!.textContent).toContain('doğrulanamadı');
    expect(page().querySelector('[role="alert"]')!.textContent!.trim()).not.toBe('');
  });
});
