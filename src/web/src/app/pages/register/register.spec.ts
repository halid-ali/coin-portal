import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Register } from './register';

describe('Register', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
      ],
    }).compileComponents();
    await useTestLanguage('tr');
  });

  it('asks to confirm the privacy policy and the terms before signing up', async () => {
    const fixture = TestBed.createComponent(Register);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const http = TestBed.inject(HttpTestingController);

    const fill = (name: string, value: string) => {
      const input = page.querySelector<HTMLInputElement>(`[formControlName=${name}]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    fill('firstName', 'Ayşe');
    fill('lastName', 'Yılmaz');
    fill('userName', 'ayse');
    fill('email', 'ayse@example.com');
    fill('birthDate', '1990-05-17');
    fill('password', 'Coinportal1');
    fill('confirmPassword', 'Coinportal1');
    const submit = () => page.querySelector<HTMLButtonElement>('button[type=submit]')!.click();

    // The label reads as one sentence with both links inside it
    const label = page.querySelector('[formControlName=acceptTerms]')!.closest('label')!;
    expect(label.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'Bu sitenin gizlilik politikasını okudum ve kullanım şartlarını kabul ediyorum.',
    );
    expect([...label.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '/privacy',
      '/terms',
    ]);

    submit();
    await fixture.whenStable();
    http.expectNone('/api/auth/register');
    expect(page.textContent).toContain('kullanım şartlarını kabul etmelisin');

    page.querySelector<HTMLInputElement>('[formControlName=acceptTerms]')!.click();
    submit();
    const request = http.expectOne('/api/auth/register');
    expect(request.request.body.acceptTerms).toBe(true);
  });
});
