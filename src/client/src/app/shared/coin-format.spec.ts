import { denominationLabel, isDenomination, suggestTitle } from './coin-format';

describe('coin-format', () => {
  it('labels denominations', () => {
    expect(denominationLabel('Euro2')).toBe('2 €');
    expect(denominationLabel('Cent50')).toBe('50 cent');
    expect(denominationLabel('Euro3')).toBe('');
    expect(denominationLabel(null)).toBe('');
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