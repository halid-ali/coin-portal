import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { UserResponse } from '../auth/auth.models';
import { AuthService } from '../auth/auth.service';
import { LanguageService } from '../i18n/language.service';
import { provideTestTransloco, useTestLanguage } from '../i18n/testing';
import { AccentService } from '../theme/accent.service';
import { ThemeService } from '../theme/theme.service';
import { AccentPreference } from './accent-preference';
import { LanguagePreference } from './language-preference';
import { UserSettings } from './settings.service';
import { ThemePreference } from './theme-preference';

const alice: UserResponse = {
  id: '1',
  userName: 'alice',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  birthDate: '1990-01-01',
  language: 'tr',
  theme: 'Light',
  accent: null,
  previousSignInAtUtc: null,
  emailConfirmed: true,
  roles: [],
};

/** Theme, accent and language chosen by the user: applied, saved to the account, undone on failure. */
describe('Preferences', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTestTransloco()],
    });
    http = TestBed.inject(HttpTestingController);
    await useTestLanguage('tr');
  });

  afterEach(() => {
    http.verify();
    document.documentElement.classList.remove('dark');
  });

  const settle = () => new Promise((resolve) => setTimeout(resolve));

  async function signIn(): Promise<void> {
    const auth = TestBed.inject(AuthService);
    const signedIn = firstValueFrom(
      auth.login({ userNameOrEmail: 'alice', password: 'x', rememberMe: true }),
    );
    http.expectOne('/api/auth/login').flush(alice);
    await settle();
    http.expectOne('/api/auth/antiforgery').flush(null);
    await signedIn;
  }

  it('applies a theme signed out without saving it', async () => {
    await TestBed.inject(ThemePreference).change('Dark');

    http.expectNone('/api/settings');
    expect(TestBed.inject(ThemeService).preference()).toBe('Dark');
  });

  it('saves a theme with the other settings as they are', async () => {
    await signIn();

    const changed = TestBed.inject(ThemePreference).change('Dark');
    // At once, before the save
    expect(TestBed.inject(ThemeService).preference()).toBe('Dark');
    await settle();
    const put = http.expectOne('/api/settings');
    // The language stays chosen: null would mean "follow the device"
    expect(put.request.body).toEqual({ language: 'tr', theme: 'Dark', accent: null });
    put.flush(put.request.body as UserSettings);
    await changed;

    expect(TestBed.inject(AuthService).currentUser()?.theme).toBe('Dark');
  });

  it('switches the theme back when saving fails', async () => {
    await signIn();

    const changed = TestBed.inject(ThemePreference).change('Dark');
    await settle();
    http.expectOne('/api/settings').flush(null, { status: 500, statusText: 'Error' });

    await expect(changed).rejects.toBeTruthy();
    expect(TestBed.inject(ThemeService).preference()).toBe('Light');
  });

  it('switches the accent back when saving fails', async () => {
    await signIn();
    const before = TestBed.inject(AccentService).current();

    const changed = TestBed.inject(AccentPreference).change('Teal');
    await settle();
    http.expectOne('/api/settings').flush(null, { status: 500, statusText: 'Error' });

    await expect(changed).rejects.toBeTruthy();
    expect(TestBed.inject(AccentService).current()).toBe(before);
  });

  it('switches the language only after the account saved it', async () => {
    await signIn();
    const language = TestBed.inject(LanguageService);

    const failed = TestBed.inject(LanguagePreference).change('de');
    await settle();
    http.expectOne('/api/settings').flush(null, { status: 500, statusText: 'Error' });
    await expect(failed).rejects.toBeTruthy();
    expect(language.current()).toBe('tr');

    const changed = TestBed.inject(LanguagePreference).change('de');
    await settle();
    const put = http.expectOne('/api/settings');
    expect(put.request.body).toEqual({ language: 'de', theme: 'Light', accent: null });
    put.flush(put.request.body as UserSettings);
    await changed;
    expect(language.current()).toBe('de');
  });
});
