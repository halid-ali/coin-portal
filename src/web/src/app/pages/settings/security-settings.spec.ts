import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserResponse } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { SecuritySettings } from './security-settings';

const USER: UserResponse = {
  id: '1',
  userName: 'ayse.yilmaz',
  email: 'ayse@example.com',
  firstName: 'Ayşe',
  lastName: 'Yılmaz',
  birthDate: '1990-05-17',
  language: null,
  theme: null,
  accent: null,
  previousSignInAtUtc: '2026-09-28T18:45:00Z',
  emailConfirmed: true,
  unverifiedMaxCoins: null,
  unverifiedDeletionDueUtc: null,
  roles: [],
};

describe('SecuritySettings', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SecuritySettings],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTestTransloco()],
    });
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(user: UserResponse = USER): Promise<ComponentFixture<SecuritySettings>> {
    const loaded = TestBed.inject(AuthService).loadMe();
    http.expectOne('/api/auth/me').flush(user);
    await loaded;
    const fixture = TestBed.createComponent(SecuritySettings);
    await fixture.whenStable();
    return fixture;
  }

  const page = (fixture: ComponentFixture<SecuritySettings>) =>
    fixture.nativeElement as HTMLElement;

  function fill(fixture: ComponentFixture<SecuritySettings>, values: Record<string, string>): void {
    for (const [id, value] of Object.entries(values)) {
      const input = page(fixture).querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
  }

  const VALID = {
    currentPassword: 'Coinportal1',
    newPassword: 'Newpass456',
    confirmPassword: 'Newpass456',
  };

  function save(fixture: ComponentFixture<SecuritySettings>): void {
    page(fixture).querySelector<HTMLButtonElement>('button[type=submit]')!.click();
  }

  // Same formatting as the component: the device's time zone, so not a fixed string
  const formatted = (lang: string) =>
    new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeStyle: 'short' }).format(
      new Date(USER.previousSignInAtUtc!),
    );

  it('shows the previous sign-in in the UI language', async () => {
    const fixture = await render();
    expect(page(fixture).textContent).toContain('Önceki giriş');
    expect(page(fixture).textContent).toContain(formatted('tr'));

    await useTestLanguage('de');
    await fixture.whenStable();
    expect(page(fixture).textContent).toContain(formatted('de'));
  });

  it('says so when no previous sign-in is recorded', async () => {
    const fixture = await render({ ...USER, previousSignInAtUtc: null });

    expect(page(fixture).textContent).toContain('Kayıtlı önceki giriş yok');
  });

  it('changes the password, then clears the form and says so', async () => {
    const fixture = await render();
    fill(fixture, VALID);
    save(fixture);

    const request = http.expectOne({ method: 'POST', url: '/api/auth/change-password' });
    expect(request.request.body).toEqual({
      currentPassword: 'Coinportal1',
      newPassword: 'Newpass456',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(page(fixture).querySelector('[role="status"]')!.textContent).toContain(
      'Parolan değişti',
    );
    expect(page(fixture).querySelector<HTMLInputElement>('#currentPassword')!.value).toBe('');
    expect(page(fixture).querySelector<HTMLInputElement>('#newPassword')!.value).toBe('');
    // Still signed in: this session goes on
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
  });

  it('checks the fields before sending', async () => {
    const fixture = await render();
    fill(fixture, { newPassword: 'newpass456', confirmPassword: 'other' });
    save(fixture);
    await fixture.whenStable();

    http.expectNone('/api/auth/change-password');
    expect(page(fixture).querySelector('#currentPassword-error')).not.toBeNull();
    expect(page(fixture).querySelector('#newPassword-error')).not.toBeNull();
    expect(page(fixture).querySelector('#confirmPassword-error')).not.toBeNull();
    expect(document.activeElement).toBe(page(fixture).querySelector('#currentPassword'));
  });

  it('shows a wrong current password on its field', async () => {
    const fixture = await render();
    fill(fixture, VALID);
    save(fixture);
    http
      .expectOne('/api/auth/change-password')
      .flush(
        { status: 400, errors: { PasswordMismatch: ['Incorrect password.'] } },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(page(fixture).querySelector('#currentPassword-error')!.textContent).toContain(
      'Mevcut parola yanlış.',
    );
    expect(page(fixture).querySelector('#newPassword-error')).toBeNull();
    expect(page(fixture).querySelector('[role="status"]')).toBeNull();
    expect(document.activeElement).toBe(page(fixture).querySelector('#currentPassword'));
  });

  it("shows the API's password rule on the new password", async () => {
    const fixture = await render();
    fill(fixture, VALID);
    save(fixture);
    http
      .expectOne('/api/auth/change-password')
      .flush(
        { status: 400, errors: { PasswordRequiresNonAlphanumeric: ['Needs a symbol.'] } },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(page(fixture).querySelector('#newPassword-error')).not.toBeNull();
    expect(page(fixture).textContent).not.toContain('Needs a symbol.');
  });
});
