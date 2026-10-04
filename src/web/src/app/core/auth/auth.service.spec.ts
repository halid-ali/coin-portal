import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { LanguageService } from '../i18n/language.service';
import { provideTestTransloco, useTestLanguage } from '../i18n/testing';
import { AccentService } from '../theme/accent.service';
import { ThemeService } from '../theme/theme.service';
import { UserResponse } from './auth.models';
import { AuthService } from './auth.service';

const alice: UserResponse = {
  id: '1',
  userName: 'alice',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  birthDate: '1990-01-01',
  language: null,
  theme: null,
  accent: null,
  previousSignInAtUtc: null,
  roles: [],
};

describe('AuthService', () => {
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTestTransloco()],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    await useTestLanguage('tr');
  });

  afterEach(() => {
    http.verify();
    document.documentElement.classList.remove('dark');
  });

  /** Lets awaited requests and promises move on. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  async function signIn(user: UserResponse = alice): Promise<UserResponse> {
    const signedIn = firstValueFrom(
      auth.login({ userNameOrEmail: user.userName, password: 'x', rememberMe: true }),
    );
    http.expectOne('/api/auth/login').flush(user);
    await settle();
    http.expectOne('/api/auth/antiforgery').flush(null);
    return signedIn;
  }

  it('restores the session first, then fetches a token bound to it', async () => {
    const started = auth.init();

    // The token belongs to the user: it waits for the session
    http.expectNone('/api/auth/antiforgery');
    http.expectOne('/api/auth/me').flush(alice);
    await settle();
    http.expectOne('/api/auth/antiforgery').flush(null);
    await started;

    expect(auth.currentUser()?.userName).toBe('alice');
  });

  it('starts signed out, also when the API is down', async () => {
    const started = auth.init();
    http.expectOne('/api/auth/me').flush(null, { status: 0, statusText: 'Unknown Error' });
    await settle();
    http.expectOne('/api/auth/antiforgery').flush(null, { status: 0, statusText: 'Unknown Error' });

    await expect(started).resolves.toBeUndefined();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it("applies the account's language, theme and accent on sign-in", async () => {
    await signIn({ ...alice, language: 'de', theme: 'Dark', accent: 'Teal' });

    expect(TestBed.inject(LanguageService).current()).toBe('de');
    expect(TestBed.inject(ThemeService).preference()).toBe('Dark');
    expect(TestBed.inject(AccentService).current()).toBe('Teal');
  });

  it("keeps this device's choices when the account has none", async () => {
    TestBed.inject(ThemeService).use('Light');

    await signIn();

    expect(TestBed.inject(LanguageService).current()).toBe('tr');
    expect(TestBed.inject(ThemeService).preference()).toBe('Light');
  });

  it('signs in even when the new token cannot be fetched', async () => {
    const signedIn = firstValueFrom(
      auth.login({ userNameOrEmail: 'alice', password: 'x', rememberMe: true }),
    );
    http.expectOne('/api/auth/login').flush(alice);
    await settle();
    http.expectOne('/api/auth/antiforgery').flush(null, { status: 500, statusText: 'Error' });

    await expect(signedIn).resolves.toEqual(alice);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('signs out also when the session was already over, and gets an anonymous token', async () => {
    await signIn();

    const signedOut = firstValueFrom(auth.logout(), { defaultValue: undefined });
    http.expectOne('/api/auth/logout').flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/antiforgery').flush(null);
    await signedOut;

    expect(auth.isAuthenticated()).toBe(false);
  });

  it('forgets an expired session once, with a fresh token', async () => {
    await signIn();

    auth.handleSessionExpired();
    http.expectOne('/api/auth/antiforgery').flush(null);
    // Already signed out: nothing more to do
    auth.handleSessionExpired();

    expect(auth.isAuthenticated()).toBe(false);
  });
});
