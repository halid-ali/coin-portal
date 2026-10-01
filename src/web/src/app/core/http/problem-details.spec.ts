import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { provideTestTransloco, useTestLanguage } from '../i18n/testing';
import { httpErrorMessage } from './problem-details';

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
