import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { UserResponse } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Home } from './home';

describe('Home', () => {
  const currentUser = signal<UserResponse | null>(null);

  beforeEach(async () => {
    currentUser.set(null);
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
        { provide: AuthService, useValue: { currentUser } },
      ],
    });
    // The page defers the new collection dialog
    await TestBed.compileComponents();
    await useTestLanguage('tr');
  });

  it('introduces the site to visitors, with sign-up and sign-in side by side', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent).toContain('Koleksiyonun, cebindeki vitrinde.');
    expect(page.querySelector('a[href="/register"]')?.textContent).toContain('Ücretsiz kayıt ol');
    expect(page.querySelector('a[href="/login"]')?.textContent).toContain('Giriş yap');
    expect(page.textContent).toContain('Reklam yok');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('shows the dashboard to a signed-in user', async () => {
    currentUser.set({ userName: 'ayse.yilmaz', firstName: 'Ayşe' } as UserResponse);
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const http = TestBed.inject(HttpTestingController);

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Hoş geldin, Ayşe!',
    );
    http.expectOne('/api/collections');
    http.expectOne('/api/coins/summary');
  });
});
