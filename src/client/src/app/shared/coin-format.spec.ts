import { TestBed } from '@angular/core/testing';

import { provideTestTransloco, useTestLanguage } from '../core/i18n/testing';
import { denominationLabel, isDenomination, suggestTitle } from './coin-format';

describe('coin-format', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  it('labels denominations', () => {
    expect(denominationLabel('Euro2')).toBe('2 €');
    expect(denominationLabel('Cent50')).toBe('50 cent');
    expect(denominationLabel('Euro3')).toBe('');
    expect(denominationLabel(null)).toBe('');
  });

  it('labels denominations in the active language', async () => {
    await useTestLanguage('bg');
    expect(denominationLabel('Cent50')).toBe('50 цента');
    expect(denominationLabel('Cent1')).toBe('1 цент');
    await useTestLanguage('de');
    expect(suggestTitle('Cent10', 'Deutschland', 2002)).toBe('10 Cent · Deutschland · 2002');
  });

  it('recognizes valid denominations only', () => {
    expect(isDenomination('Cent1')).toBe(true);
    expect(isDenomination('cent1')).toBe(false);
    expect(isDenomination(undefined)).toBe(false);
  });

  it('builds a title from the available parts', () => {
    expect(suggestTitle('Euro2', 'Almanya', 2006)).toBe('2 € · Almanya · 2006');
    expect(suggestTitle('Cent10', null, null)).toBe('10 cent');
    expect(suggestTitle('', 'Fransa', 2002)).toBe('Fransa · 2002');
    expect(suggestTitle(null, null, null)).toBe('');
  });
});
