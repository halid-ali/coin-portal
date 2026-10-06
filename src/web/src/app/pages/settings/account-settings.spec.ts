import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';

import { authInterceptor } from '../../core/auth/auth.interceptor';
import { AuthService } from '../../core/auth/auth.service';
import { UserResponse } from '../../core/auth/auth.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { pressEscape, stubModalDialogs } from '../../shared/testing/dialogs';
import { Home } from '../home/home';
import { AccountSettings } from './account-settings';

@Component({ template: '' })
class Blank {}

const user = (roles: string[]): UserResponse => ({
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
  roles,
});

describe('AccountSettings', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  beforeEach(async () => {
    stubModalDialogs();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Home },
          { path: 'settings/account', component: AccountSettings },
          { path: 'blank', component: Blank },
          { path: 'login', component: Blank },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideTestTransloco(),
      ],
    });
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => document.querySelectorAll('dialog').forEach((d) => d.remove()));

  // Through the real sign-in, so the sign-out after deletion is the real one too
  async function signIn(roles: string[] = []): Promise<void> {
    const done = firstValueFrom(
      TestBed.inject(AuthService).login({
        userNameOrEmail: 'alice',
        password: 'x',
        rememberMe: true,
      }),
    );
    http.expectOne('/api/auth/login').flush(user(roles));
    http.expectOne('/api/auth/antiforgery').flush(null);
    await done;
  }
  const page = () => harness.routeNativeElement!;

  async function openDialog(): Promise<HTMLElement> {
    await harness.navigateByUrl('/settings/account');
    const button = [...page().querySelectorAll('button')].find((b) =>
      b.textContent!.includes('Hesabımı sil'),
    )!;
    button.click();
    await harness.fixture.whenStable();
    return page().querySelector<HTMLElement>('app-delete-account-dialog')!;
  }

  async function submit(dialog: HTMLElement, password: string): Promise<void> {
    const input = dialog.querySelector<HTMLInputElement>('input[type=password]')!;
    input.value = password;
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    dialog.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
  }

  it('offers the data export as a plain download link', async () => {
    await signIn();
    await harness.navigateByUrl('/settings/account');

    const link = page().querySelector<HTMLAnchorElement>('a[download]')!;
    expect(link.getAttribute('href')).toBe('/api/settings/export');
  });

  describe('data export', () => {
    let downloads: string[];

    beforeEach(() => {
      downloads = [];
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        downloads.push(this.getAttribute('href')!);
      });
    });
    afterEach(() => vi.restoreAllMocks());

    async function clickExport(): Promise<void> {
      await signIn();
      await harness.navigateByUrl('/settings/account');
      const link = page().querySelector<HTMLAnchorElement>('a[download]')!;
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    }

    it('checks the session, then downloads', async () => {
      await clickExport();
      expect(downloads).toEqual([]);

      http.expectOne('/api/settings').flush({ language: null, theme: null, accent: null });
      await vi.waitFor(() => expect(downloads).toEqual(['/api/settings/export']));
    });

    it('goes to the login page when the session has ended', async () => {
      await clickExport();

      http.expectOne('/api/settings').flush(null, { status: 401, statusText: 'Unauthorized' });
      http.expectOne('/api/auth/antiforgery').flush(null);

      await vi.waitFor(() => expect(TestBed.inject(Router).url).toMatch(/^\/login\?returnUrl=/));
      expect(downloads).toEqual([]);
    });

    it('says why when it cannot start', async () => {
      await clickExport();

      http.expectOne('/api/settings').flush(null, { status: 503, statusText: 'Unavailable' });
      await harness.fixture.whenStable();

      expect(page().querySelector('[role=alert]')!.textContent).toContain('Beklenmeyen bir hata');
      expect(downloads).toEqual([]);
    });
  });

  it('keeps the dialog open with a message on a wrong password', async () => {
    await signIn();
    const dialog = await openDialog();

    await submit(dialog, 'Wrongpass1');
    const request = http.expectOne('/api/settings/account');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ password: 'Wrongpass1' });
    request.flush({ code: 'wrong_password' }, { status: 400, statusText: 'Bad Request' });
    harness.detectChanges();

    expect(dialog.querySelector('[role=alert]')!.textContent).toContain('Parola yanlış');
    expect(dialog.querySelector('dialog')!.open).toBe(true);
  });

  it('closes on Escape, but not while the account is being deleted', async () => {
    await signIn();
    let dialog = await openDialog();
    pressEscape(dialog.querySelector('dialog')!);
    await harness.fixture.whenStable();
    expect(page().querySelector('app-delete-account-dialog')).toBeNull();

    dialog = await openDialog();
    await submit(dialog, 'Coinportal1');
    const request = http.expectOne('/api/settings/account');
    pressEscape(dialog.querySelector('dialog')!);
    // The deletion would go on unseen
    expect(dialog.querySelector('dialog')!.open).toBe(true);
    request.flush({ code: 'wrong_password' }, { status: 400, statusText: 'Bad Request' });
  });

  it('signs out and tells the home page once the account is gone', async () => {
    await signIn();
    const dialog = await openDialog();

    await submit(dialog, 'Coinportal1');
    http.expectOne('/api/settings/account').flush(null, { status: 204, statusText: 'No Content' });
    // Antiforgery token for the signed-out user
    http.expectOne('/api/auth/antiforgery').flush(null);
    await harness.fixture.whenStable();

    expect(TestBed.inject(AuthService).currentUser()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/');
    expect(page().textContent).toContain('Hesabın ve tüm verilerin silindi');

    // Only right after the deletion
    await harness.navigateByUrl('/blank');
    await harness.navigateByUrl('/');
    expect(page().textContent).not.toContain('Hesabın ve tüm verilerin silindi');
  });

  it('tells admins why they cannot delete their account here', async () => {
    await signIn(['Admin']);
    await harness.navigateByUrl('/settings/account');

    expect(page().textContent).toContain('Yönetici hesapları buradan silinemez');
    expect(
      [...page().querySelectorAll('button')].some((b) => b.textContent!.includes('Hesabımı sil')),
    ).toBe(false);
  });
});
