import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideAdminTranslations } from '../../core/admin/admin-translations';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { AdminSettings } from './admin-settings';
import { SKELETON_DELAY_MS } from '../../shared/skeleton';

const stored = {
  minPublicCoins: 10,
  unverifiedMaxCoins: 20,
  unverifiedLifetimeDays: 30,
  userQuotaMegabytes: 300,
};

describe('AdminSettings', () => {
  let fixture: ComponentFixture<AdminSettings>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSettings],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
        provideAdminTranslations(),
      ],
    }).compileComponents();
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminSettings);
    await fixture.whenStable();
    http.expectOne('/api/admin/settings').flush(stored);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const page = () => fixture.nativeElement as HTMLElement;
  const input = (id = 'min-public-coins') => page().querySelector<HTMLInputElement>('#' + id)!;

  async function type(value: string, id?: string): Promise<void> {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('shows the stored values', async () => {
    // The admin scope loads with its own import
    await vi.waitFor(() => expect(page().textContent).toContain('En az fotoğraflı coin sayısı'));
    expect(input().value).toBe('10');
    expect(input('unverified-max-coins').value).toBe('20');
    expect(input('unverified-lifetime-days').value).toBe('30');
    expect(input('user-quota-megabytes').value).toBe('300');
  });

  it('tells how many public collections a new value leaves below it', async () => {
    await type('20');

    // After the typing pause
    const request = await vi.waitFor(() =>
      http.expectOne((r) => r.url === '/api/admin/settings/impact'),
    );
    expect(request.request.params.get('minPublicCoins')).toBe('20');
    request.flush({ minPublicCoins: 20, publicCollectionsBelow: 3 });
    await vi.waitFor(() =>
      expect(page().textContent).toContain(
        'Bu değerle yayındaki 3 koleksiyon eşiğin altında kalır',
      ),
    );
  });

  it('saves the value with the note', async () => {
    await type('12');
    const note = page().querySelector<HTMLTextAreaElement>('#settings-note')!;
    note.value = ' More photos ';
    note.dispatchEvent(new Event('input'));
    page().querySelector('form')!.dispatchEvent(new Event('submit'));

    const request = http.expectOne((r) => r.method === 'PUT');
    expect(request.request.body).toEqual({ ...stored, minPublicCoins: 12, note: 'More photos' });
    request.flush({ ...stored, minPublicCoins: 12 });
    await vi.waitFor(() => expect(page().textContent).toContain('Kaydedildi.'));
    // A pending impact lookup of the typed value is not needed any more
    http.match((r) => r.url === '/api/admin/settings/impact').forEach((r) => r.flush(null));
  });

  it('saves the coin limit of unverified accounts, 0 included', async () => {
    await type('0', 'unverified-max-coins');
    page().querySelector('form')!.dispatchEvent(new Event('submit'));

    const request = http.expectOne((r) => r.method === 'PUT');
    expect(request.request.body).toEqual({ ...stored, unverifiedMaxCoins: 0, note: '' });
    request.flush({ ...stored, unverifiedMaxCoins: 0 });
    await vi.waitFor(() => expect(page().textContent).toContain('Kaydedildi.'));
    expect(input('unverified-max-coins').value).toBe('0');
    // The minimum did not change: no impact lookup
    http.expectNone((r) => r.url === '/api/admin/settings/impact');
  });

  it('tells how many users a new photo storage leaves above it, and saves it', async () => {
    await type('100', 'user-quota-megabytes');

    const impact = await vi.waitFor(() =>
      http.expectOne((r) => r.url === '/api/admin/settings/quota-impact'),
    );
    expect(impact.request.params.get('userQuotaMegabytes')).toBe('100');
    impact.flush({ userQuotaMegabytes: 100, usersAbove: 3 });
    await vi.waitFor(() =>
      expect(page().textContent).toContain('Bu değerle 3 kullanıcı sınırın üstünde kalır.'),
    );
    // The unit sits in the field; screen readers get it with the label
    expect(page().querySelector('label[for=user-quota-megabytes]')!.textContent).toContain('(MB)');

    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    const request = http.expectOne((r) => r.method === 'PUT');
    expect(request.request.body).toEqual({ ...stored, userQuotaMegabytes: 100, note: '' });
    request.flush({ ...stored, userQuotaMegabytes: 100 });
    await vi.waitFor(() => expect(page().textContent).toContain('Kaydedildi.'));
    expect(page().textContent).not.toContain('sınırın üstünde kalır');
    http.expectNone((r) => r.url === '/api/admin/settings/impact');
  });

  it('says so instead of saving the stored values again', async () => {
    // The API writes the audit entry, and with it the note, only for a change
    const note = page().querySelector<HTMLTextAreaElement>('#settings-note')!;
    note.value = 'Just checking';
    note.dispatchEvent(new Event('input'));
    page().querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() =>
      expect(page().textContent).toContain('Değerler değişmedi; kaydedilecek bir şey yok.'),
    );
    http.expectNone((r) => r.method === 'PUT');
    expect(page().textContent).not.toContain('Kaydedildi.');
  });

  it('does not save a value out of range', async () => {
    await type('0');
    await type('-1', 'unverified-max-coins');
    await type('366', 'unverified-lifetime-days');
    await type('49', 'user-quota-megabytes');
    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    http.expectNone((r) => r.method === 'PUT');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input('unverified-max-coins').getAttribute('aria-invalid')).toBe('true');
    expect(input('unverified-lifetime-days').getAttribute('aria-invalid')).toBe('true');
    expect(input('user-quota-megabytes').getAttribute('aria-invalid')).toBe('true');
  });

  it('shows a placeholder for each value while they take a while, without Save', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const slow = TestBed.createComponent(AdminSettings);
      await slow.whenStable();
      vi.advanceTimersByTime(SKELETON_DELAY_MS);
      await slow.whenStable();
      const element = slow.nativeElement as HTMLElement;

      expect(element.querySelectorAll('section.card')).toHaveLength(3);
      expect(element.querySelectorAll('.skeleton')).toHaveLength(4);
      expect(element.querySelector('#min-public-coins')).toBeNull();
      expect(element.querySelector('button[type=submit]')).toBeNull();

      http.expectOne('/api/admin/settings').flush(stored);
      await slow.whenStable();
      expect(element.querySelectorAll('.skeleton')).toHaveLength(0);
      expect(element.querySelector('#min-public-coins')).not.toBeNull();
      expect(element.querySelector('button[type=submit]')).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
