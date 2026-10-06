import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { provideTestTransloco, useTestLanguage } from '../core/i18n/testing';
import { ConfirmDialogService } from './confirm-dialog/confirm-dialog.service';
import { UNPUBLISH_DECLINED, UnpublishConfirm } from './unpublish-confirm';

describe('UnpublishConfirm', () => {
  let confirm: ReturnType<typeof vi.fn>;
  let service: UnpublishConfirm;

  const wouldUnpublish = new HttpErrorResponse({
    status: 409,
    error: { code: 'would_unpublish', collections: [{ id: 4, name: 'Vitrin' }] },
  });

  beforeEach(async () => {
    confirm = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideTestTransloco(), { provide: ConfirmDialogService, useValue: { confirm } }],
    });
    await useTestLanguage('tr');
    service = TestBed.inject(UnpublishConfirm);
  });

  it('runs the change once when nothing public breaks', async () => {
    const request = vi.fn(() => of('saved'));

    expect(await service.run(request)).toBe('saved');
    expect(request.mock.calls).toEqual([[false]]);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks, and runs the change again confirmed', async () => {
    confirm.mockResolvedValue(true);
    const request = vi.fn((unpublish: boolean) =>
      unpublish ? of('saved') : throwError(() => wouldUnpublish),
    );

    expect(await service.run(request)).toBe('saved');
    expect(request.mock.calls).toEqual([[false], [true]]);
    const options = confirm.mock.calls[0][0];
    expect(options.title).toBe('Koleksiyon herkese açık olmaktan çıkacak');
    expect(options.message).toContain('"Vitrin" herkese açık koleksiyon şartlarını karşılamıyor');
  });

  it('names every collection a move would take down, in the language of the page', async () => {
    await useTestLanguage('de');
    confirm.mockResolvedValue(false);
    const both = new HttpErrorResponse({
      status: 409,
      error: {
        code: 'would_unpublish',
        collections: [
          { id: 4, name: 'Vitrin' },
          { id: 5, name: 'Gedenkmünzen' },
        ],
      },
    });

    await service.run(() => throwError(() => both));

    const options = confirm.mock.calls[0][0];
    expect(options.title).toBe('Die Sammlungen sind dann nicht mehr öffentlich');
    expect(options.message).toContain('erfüllen „Vitrin“ und „Gedenkmünzen“ die Bedingungen');
  });

  it('changes nothing when the user keeps the collection public', async () => {
    confirm.mockResolvedValue(false);
    const request = vi.fn(() => throwError(() => wouldUnpublish));

    expect(await service.run(request)).toBe(UNPUBLISH_DECLINED);
    expect(request.mock.calls).toEqual([[false]]);
  });

  it('passes other errors on', async () => {
    const failure = new HttpErrorResponse({ status: 500 });

    await expect(service.run(() => throwError(() => failure))).rejects.toBe(failure);
    expect(confirm).not.toHaveBeenCalled();
  });
});
