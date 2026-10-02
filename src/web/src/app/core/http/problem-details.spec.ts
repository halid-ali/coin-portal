import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';

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
});
