import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideAdminTranslations } from '../../core/admin/admin-translations';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import {
  AdminVerificationRequestsPanel,
  VERIFICATION_POLL_MS,
} from './admin-verification-requests';

const URL = '/api/admin/verification-requests';

describe('AdminVerificationRequestsPanel', () => {
  let fixture: ComponentFixture<AdminVerificationRequestsPanel>;
  let http: HttpTestingController;
  let confirmWithNote: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    confirmWithNote = vi.fn().mockResolvedValue('Release');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTransloco(),
        provideAdminTranslations(),
        { provide: ConfirmDialogService, useValue: { confirmWithNote } },
      ],
    });
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const startButton = () => (fixture.nativeElement as HTMLElement).querySelector('button')!;

  async function open(pending: number): Promise<void> {
    fixture = TestBed.createComponent(AdminVerificationRequestsPanel);
    http.expectOne(URL).flush({ pending, lastRun: null });
    // The admin scope's texts come with their own chunk
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(text()).toContain('Doğrulama e-postası');
    });
  }

  it('starts after asking, then follows the run until it is done', async () => {
    await open(3);
    expect(startButton().textContent).toContain('3 hesaba gönder');
    // The poll's pause is skipped; Angular's own timers keep running
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });

    startButton().click();
    await vi.waitFor(() => expect(confirmWithNote).toHaveBeenCalled());
    const start = await vi.waitFor(() => http.expectOne((r) => r.method === 'POST'));
    expect(start.request.body).toEqual({ note: 'Release' });
    start.flush({
      pending: 3,
      lastRun: {
        startedAtUtc: new Date().toISOString(),
        finishedAtUtc: null,
        total: 3,
        sent: 1,
        failed: 0,
      },
    });
    await vi.waitFor(() => expect(text()).toContain('Gönderiliyor: 1/3'));
    // Pressed again while it runs: nothing
    startButton().click();
    expect(confirmWithNote).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(VERIFICATION_POLL_MS);
    (await vi.waitFor(() => http.expectOne(URL))).flush({
      pending: 1,
      lastRun: {
        startedAtUtc: new Date().toISOString(),
        finishedAtUtc: new Date().toISOString(),
        total: 3,
        sent: 2,
        failed: 1,
      },
    });
    await vi.waitFor(() => expect(text()).toContain('2 gönderildi, 1 gönderilemedi'));
    // Done: no more asking
    vi.advanceTimersByTime(VERIFICATION_POLL_MS * 2);
    http.expectNone(URL);
  });

  it('has nothing to start without pending accounts', async () => {
    await open(0);

    expect(text()).toContain('Gönderilecek hesap yok.');
    expect(startButton().getAttribute('aria-disabled')).toBe('true');
    startButton().click();
    await fixture.whenStable();
    expect(confirmWithNote).not.toHaveBeenCalled();
  });
});
