import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { UserResponse } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Header } from './header';

@Component({ template: '' })
class Page {}

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
  roles: [],
};

describe('Header', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Page },
          { path: 'explore', component: Page },
          { path: 'collections', component: Page },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
      ],
    });
    await useTestLanguage('tr');

    const http = TestBed.inject(HttpTestingController);
    const signedIn = firstValueFrom(
      TestBed.inject(AuthService).login({
        userNameOrEmail: 'alice',
        password: 'x',
        rememberMe: true,
      }),
    );
    http.expectOne('/api/auth/login').flush(user);
    http.expectOne('/api/auth/antiforgery').flush(null);
    await signedIn;
  });

  async function create() {
    const fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  it('names the account button, also where only the avatar shows', async () => {
    const { page } = await create();
    const button = page.querySelector<HTMLButtonElement>('button[aria-controls="user-menu"]')!;
    expect(button.getAttribute('aria-label')).toBe('Hesap menüsü: alice');
    expect(button.hasAttribute('aria-haspopup')).toBe(false);
  });

  it('opens a panel of links and gives the focus back on Escape', async () => {
    const { fixture, page } = await create();
    const button = page.querySelector<HTMLButtonElement>('button[aria-controls="user-menu"]')!;
    button.click();
    await fixture.whenStable();

    const panel = page.querySelector('#user-menu')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    // Links and a button, no half-done ARIA menu
    expect(panel.hasAttribute('role')).toBe(false);
    expect(panel.querySelector('[role=menuitem]')).toBeNull();

    panel.querySelector<HTMLAnchorElement>('a')!.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(page.querySelector('#user-menu')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('marks the link of the current page', async () => {
    const { fixture, page } = await create();
    await TestBed.inject(Router).navigateByUrl('/explore');
    await fixture.whenStable();

    const current = page.querySelectorAll('a[aria-current="page"]');
    expect([...current].map((a) => a.getAttribute('href'))).toEqual(['/explore']);
  });
});
