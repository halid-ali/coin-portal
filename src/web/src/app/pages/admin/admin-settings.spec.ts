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
    http.expectOne('/api/admin/settings').flush({ minPublicCoins: 10 });
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const page = () => fixture.nativeElement as HTMLElement;
  const input = () => page().querySelector<HTMLInputElement>('#min-public-coins')!;

  async function type(value: string): Promise<void> {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('shows the stored minimum', async () => {
    // The admin scope loads with its own import
    await vi.waitFor(() => expect(page().textContent).toContain('En az fotoğraflı coin sayısı'));
    expect(input().value).toBe('10');
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
    expect(request.request.body).toEqual({ minPublicCoins: 12, note: 'More photos' });
    request.flush({ minPublicCoins: 12 });
    await vi.waitFor(() => expect(page().textContent).toContain('Kaydedildi.'));
    // A pending impact lookup of the typed value is not needed any more
    http.match((r) => r.url === '/api/admin/settings/impact').forEach((r) => r.flush(null));
  });

  it('says so instead of saving the stored value again', async () => {
    // The API writes the audit entry, and with it the note, only for a change
    const note = page().querySelector<HTMLTextAreaElement>('#settings-note')!;
    note.value = 'Just checking';
    note.dispatchEvent(new Event('input'));
    page().querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() =>
      expect(page().textContent).toContain('Değer zaten 10; kaydedilecek bir değişiklik yok.'),
    );
    http.expectNone((r) => r.method === 'PUT');
    expect(page().textContent).not.toContain('Kaydedildi.');
  });

  it('does not save a value out of range', async () => {
    await type('0');
    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    http.expectNone((r) => r.method === 'PUT');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });
});
