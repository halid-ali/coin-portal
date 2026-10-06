import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideAdminTranslations } from '../../core/admin/admin-translations';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { AdminSettings } from './admin-settings';

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
    http.expectOne('/api/admin/settings').flush({ minPublicCoins: 10, unverifiedMaxCoins: 20 });
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
    expect(request.request.body).toEqual({
      minPublicCoins: 12,
      unverifiedMaxCoins: 20,
      note: 'More photos',
    });
    request.flush({ minPublicCoins: 12, unverifiedMaxCoins: 20 });
    await vi.waitFor(() => expect(page().textContent).toContain('Kaydedildi.'));
    // A pending impact lookup of the typed value is not needed any more
    http.match((r) => r.url === '/api/admin/settings/impact').forEach((r) => r.flush(null));
  });

  it('saves the coin limit of unverified accounts, 0 included', async () => {
    await type('0', 'unverified-max-coins');
    page().querySelector('form')!.dispatchEvent(new Event('submit'));

    const request = http.expectOne((r) => r.method === 'PUT');
    expect(request.request.body).toEqual({ minPublicCoins: 10, unverifiedMaxCoins: 0, note: '' });
    request.flush({ minPublicCoins: 10, unverifiedMaxCoins: 0 });
    await vi.waitFor(() => expect(page().textContent).toContain('Kaydedildi.'));
    expect(input('unverified-max-coins').value).toBe('0');
    // The minimum did not change: no impact lookup
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
    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    http.expectNone((r) => r.method === 'PUT');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input('unverified-max-coins').getAttribute('aria-invalid')).toBe('true');
  });
});
