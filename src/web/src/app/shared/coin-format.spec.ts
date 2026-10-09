import { TestBed } from '@angular/core/testing';

import { provideTestTransloco, useTestLanguage } from '../core/i18n/testing';
import {
  coinValueLabel,
  denominationLabel,
  faceValueLabel,
  isDenomination,
  sideHintKey,
  sideLabelKey,
  suggestTitle,
  suggestTitleFromValue,
} from './coin-format';

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

  describe('coins other than euro coins', () => {
    it("writes the face value in the language's number format, with the currency as typed", () => {
      expect(faceValueLabel(0.5, 'penny', 'tr')).toBe('0,5 penny');
      expect(faceValueLabel(0.5, 'penny', 'en')).toBe('0.5 penny');
      expect(faceValueLabel(1000000, 'Mark', 'de')).toBe('1.000.000 Mark');
      expect(faceValueLabel(0.0001, 'kuruş', 'tr')).toBe('0,0001 kuruş');
      expect(faceValueLabel(null, 'kuruş', 'tr')).toBe('kuruş');
    });

    it('labels the value of either kind', () => {
      const euro = {
        kind: 'Euro',
        denomination: 'Euro2',
        faceValue: null,
        currency: null,
      } as const;
      const other = {
        kind: 'Other',
        denomination: null,
        faceValue: 25,
        currency: 'kuruş',
      } as const;
      expect(coinValueLabel(euro, 'tr')).toBe('2 €');
      expect(coinValueLabel(other, 'tr')).toBe('25 kuruş');
    });

    it('builds a title from a value of either kind', () => {
      expect(suggestTitleFromValue('25 kuruş', 'Türkiye', 1975)).toBe('25 kuruş · Türkiye · 1975');
      expect(suggestTitleFromValue('', 'Doğu Almanya', null)).toBe('Doğu Almanya');
    });

    it('names the sides national and common, or front and back', () => {
      expect(sideLabelKey('Euro', 'National')).toBe('coin.side.National.label');
      expect(sideLabelKey(undefined, 'Common')).toBe('coin.side.Common.label');
      expect(sideLabelKey('Other', 'National')).toBe('coin.otherSide.National.label');
      expect(sideHintKey('Other', 'Common')).toBe('coin.otherSide.Common.hint');
    });
  });
});
