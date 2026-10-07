import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserResponse } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { EmailBanner } from './email-banner';

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

describe('EmailBanner', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTestTransloco()],
    });
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(user: UserResponse | null): Promise<ComponentFixture<EmailBanner>> {
    if (user) {
      const loaded = TestBed.inject(AuthService).loadMe();
      http.expectOne('/api/auth/me').flush(user);
      await loaded;
    }
    const fixture = TestBed.createComponent(EmailBanner);
    await fixture.whenStable();
    return fixture;
  }

  const element = (fixture: ComponentFixture<EmailBanner>) => fixture.nativeElement as HTMLElement;
  const resendButton = (fixture: ComponentFixture<EmailBanner>) =>
    [...element(fixture).querySelectorAll('button')].find((b) =>
      b.textContent!.includes('tekrar gönder'),
    )!;

  it('names the day the account is deleted without verification', async () => {
    const fixture = await render({ ...USER, unverifiedDeletionDueUtc: '2026-11-06T22:30:00Z' });

    // The UTC day, like the reminder e-mail's, in bold within the sentence
    expect(element(fixture).textContent).toContain(
      'Doğrulamazsan hesabın 6 Kasım 2026 tarihinde silinecek.',
    );
    expect(element(fixture).querySelector('strong')!.textContent).toBe('6 Kasım 2026');
  });

  it('is not shown signed out', async () => {
    expect(element(await render(null)).textContent!.trim()).toBe('');
  });

  it('is not shown once the address is confirmed', async () => {
    expect(element(await render({ ...USER, emailConfirmed: true })).textContent!.trim()).toBe('');
  });

  it('asks to confirm the address and sends the link again', async () => {
    const fixture = await render(USER);
    expect(element(fixture).textContent).toContain('E-posta adresini doğrula: alice@example.com');
    // What waits for the address, with the coin limit of the site
    const limits = [...element(fixture).querySelectorAll('li')].map((li) => li.textContent!.trim());
    expect(limits).toEqual([
      '• Yeni koleksiyon açamazsın',
      '• Koleksiyon paylaşamazsın',
      '• En fazla 20 coin ekleyebilirsin',
    ]);
    // No date while the lifetime is off
    expect(element(fixture).textContent).not.toContain('silinecek');

    resendButton(fixture).click();
    // Pressed again while sending: no second request
    resendButton(fixture).click();
    http.expectOne({ method: 'POST', url: '/api/auth/verify-email/resend' }).flush(null);
    await fixture.whenStable();

    expect(element(fixture).querySelector('[role="status"]')!.textContent).toContain('Yeni link');
  });

  it('says when the mail could not be sent, or was asked for too often', async () => {
    const fixture = await render(USER);
    const alert = () => element(fixture).querySelector('[role="alert"]')!.textContent;

    resendButton(fixture).click();
    http
      .expectOne('/api/auth/verify-email/resend')
      .flush({ code: 'email_not_sent' }, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();
    expect(alert()).toContain('şu an gönderilemedi');

    resendButton(fixture).click();
    http
      .expectOne('/api/auth/verify-email/resend')
      .flush(null, { status: 429, statusText: 'Too Many Requests' });
    await fixture.whenStable();
    expect(alert()).not.toContain('şu an gönderilemedi');
    expect(alert()!.trim()).not.toBe('');
  });
});
