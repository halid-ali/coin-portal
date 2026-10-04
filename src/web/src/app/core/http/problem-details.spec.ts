import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { translate } from '@jsverse/transloco';

import { provideTestTransloco, useTestLanguage } from '../i18n/testing';
import { applyServerErrors, httpErrorMessage } from './problem-details';

describe('httpErrorMessage', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  const message = (status: number) => httpErrorMessage(new HttpErrorResponse({ status }));

  it('tells a network failure, a rate limit and other errors apart', () => {
    expect(message(0)).toContain('Sunucuya ulaşılamıyor');
    expect(message(403)).toContain('yetkin yok');
    expect(message(423)).toContain('kilitlendi');
    expect(message(429)).toContain('çok fazla istek');
    expect(message(500)).toContain('Beklenmeyen bir hata');
  });
});

describe('applyServerErrors', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  it('shows the account limits by their code, not as a rejected request', () => {
    const form = new FormGroup({ name: new FormControl('') });
    const coded = (code: string) =>
      applyServerErrors(form, new HttpErrorResponse({ status: 400, error: { code } }));

    expect(coded('collection_limit')[0]).toContain('en fazla 50 koleksiyon');
    expect(coded('coin_limit')[0]).toContain('en fazla 10.000 coin');
  });

  it("maps the form's own codes whatever the status", () => {
    const form = new FormGroup({ name: new FormControl('') });
    const error = new HttpErrorResponse({ status: 403, error: { code: 'moderation_locked' } });
    expect(
      applyServerErrors(
        form,
        error,
        {},
        { moderation_locked: 'collections.errors.moderation_locked' },
      ),
    ).toEqual([translate('collections.errors.moderation_locked')]);
  });

  it('calls only a 400 without a body a rejected request', () => {
    const form = new FormGroup({ name: new FormControl('') });
    expect(applyServerErrors(form, new HttpErrorResponse({ status: 400 }))[0]).toContain(
      'Sayfayı yenileyip',
    );
    // A code the form does not know is not about a stale page
    const coded = new HttpErrorResponse({ status: 400, error: { code: 'something_new' } });
    expect(applyServerErrors(form, coded)[0]).toContain('Beklenmeyen bir hata');
  });

  it('puts field errors on the matching controls', () => {
    const form = new FormGroup({ name: new FormControl('') });
    const error = new HttpErrorResponse({
      status: 400,
      error: { errors: { Name: ['The Name field is required.'], Other: ['Something else.'] } },
    });
    expect(applyServerErrors(form, error)).toEqual(['Something else.']);
    expect(form.controls.name.errors).toEqual({ server: 'The Name field is required.' });
  });
});
