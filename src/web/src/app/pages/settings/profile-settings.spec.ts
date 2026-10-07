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
  emailConfirmed: true,
  unverifiedMaxCoins: null,
  unverifiedDeletionDueUtc: null,
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

  it('shows the account details, the date of birth in the UI language', async () => {
    const text = await renderedText();
    expect(text).toContain('ayse.yilmaz');
    expect(text).toContain('ayse@example.com');
    expect(text).toContain('17 Mayıs 1990');
    // Moved to Settings > Security
    expect(text).not.toContain('Önceki giriş');

    await useTestLanguage('de');
    expect(await renderedText()).toContain('17. Mai 1990');
  });
});
