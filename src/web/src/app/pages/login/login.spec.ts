import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Login } from './login';

describe('Login', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
      ],
    }).compileComponents();
    await useTestLanguage('tr');
  });

  it('remembers the sign-in unless the user unchecks it', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const checkbox = page.querySelector<HTMLInputElement>('input[type=checkbox]')!;
    expect(checkbox.checked).toBe(true);

    const type = (name: string, value: string) => {
      const input = page.querySelector<HTMLInputElement>(`[formControlName=${name}]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('userNameOrEmail', 'ayse.yilmaz');
    type('password', 'Coinportal1');
    page.querySelector<HTMLButtonElement>('button[type=submit]')!.click();

    const request = TestBed.inject(HttpTestingController).expectOne('/api/auth/login');
    expect(request.request.body).toEqual({
      userNameOrEmail: 'ayse.yilmaz',
      password: 'Coinportal1',
      rememberMe: true,
    });
  });
});
