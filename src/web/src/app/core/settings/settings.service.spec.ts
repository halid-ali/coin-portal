import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { UserResponse } from '../auth/auth.models';
import { AuthService } from '../auth/auth.service';
import { provideTestTransloco } from '../i18n/testing';
import { SettingsService, UserSettings } from './settings.service';

const user: UserResponse = {
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
  emailConfirmed: true,
  unverifiedMaxCoins: null,
  roles: [],
};

describe('SettingsService', () => {
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTestTransloco()],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);

    const signedIn = firstValueFrom(
      auth.login({ userNameOrEmail: 'alice', password: 'x', rememberMe: true }),
    );
    http.expectOne('/api/auth/login').flush(user);
    http.expectOne('/api/auth/antiforgery').flush(null);
    await signedIn;
  });

  afterEach(() => http.verify());

  /** Lets the queued promise chain move on. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  it('sends a change made while another is on its way after it, with both', async () => {
    const settings = TestBed.inject(SettingsService);
    const theme = firstValueFrom(settings.update({ theme: 'Dark' }));
    const accent = firstValueFrom(settings.update({ accent: 'Teal' }));
    await settle();

    const first = http.expectOne('/api/settings');
    expect(first.request.body).toEqual({ language: null, theme: 'Dark', accent: null });
    first.flush(first.request.body as UserSettings);
    await settle();

    const second = http.expectOne('/api/settings');
    expect(second.request.body).toEqual({ language: null, theme: 'Dark', accent: 'Teal' });
    second.flush(second.request.body as UserSettings);

    await Promise.all([theme, accent]);
    expect(auth.currentUser()).toMatchObject({ theme: 'Dark', accent: 'Teal' });
  });

  it('goes on with the next change after one failed', async () => {
    const settings = TestBed.inject(SettingsService);
    const theme = firstValueFrom(settings.update({ theme: 'Dark' }));
    const accent = firstValueFrom(settings.update({ accent: 'Teal' }));
    await settle();

    http.expectOne('/api/settings').flush(null, { status: 500, statusText: 'Server Error' });
    await expect(theme).rejects.toBeTruthy();
    await settle();

    const second = http.expectOne('/api/settings');
    // The failed theme was not saved, so it is not sent either
    expect(second.request.body).toEqual({ language: null, theme: null, accent: 'Teal' });
    second.flush(second.request.body as UserSettings);
    await accent;
  });
});
