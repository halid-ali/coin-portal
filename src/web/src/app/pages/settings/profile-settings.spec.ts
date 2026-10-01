import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UserResponse } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { ProfileSettings } from './profile-settings';

const USER: UserResponse = {
  id: '1',
  userName: 'ayse.yilmaz',
  email: 'ayse@example.com',
  firstName: 'Ayşe',
  lastName: 'Yılmaz',
  birthDate: '1990-05-17',
  language: 'tr',
  theme: null,
  accent: null,
  previousSignInAtUtc: '2026-09-28T18:45:00Z',
  roles: [],
};

describe('ProfileSettings', () => {
  const user = signal<UserResponse | null>(USER);

  beforeEach(async () => {
    user.set(USER);
    await TestBed.configureTestingModule({
      imports: [ProfileSettings],
      providers: [
        provideTestTransloco(),
        { provide: AuthService, useValue: { currentUser: user } },
      ],
    }).compileComponents();
    await useTestLanguage('tr');
  });

  async function renderedText(): Promise<string> {
    const fixture = TestBed.createComponent(ProfileSettings);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  // Same formatting as the component: the device's time zone, so not a fixed string
  const formatted = (lang: string) =>
    new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeStyle: 'short' }).format(
      new Date(USER.previousSignInAtUtc!),
    );

  it('shows the previous sign-in in the UI language', async () => {
    expect(await renderedText()).toContain('Önceki giriş');
    expect(await renderedText()).toContain(formatted('tr'));

    await useTestLanguage('de');
    expect(await renderedText()).toContain(formatted('de'));
  });

  it('says so when no previous sign-in is recorded', async () => {
    user.set({ ...USER, previousSignInAtUtc: null });

    expect(await renderedText()).toContain('Kayıtlı önceki giriş yok');
  });
});
