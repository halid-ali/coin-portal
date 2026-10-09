import { DENOMINATIONS } from '../../core/coins/coin.models';
import { nominalOptions, nominalSelection, showKinds, toKind } from './coin-filters';

const facets = (euroCount: number, otherCount: number, currencies: string[] = []) => ({
  euroCount,
  otherCount,
  currencies,
  countryCodes: [],
});

describe('coin filters', () => {
  it('reads the kind from the URL', () => {
    expect(toKind('Euro')).toBe('Euro');
    expect(toKind('Other')).toBe('Other');
    expect(toKind('other')).toBeUndefined();
    expect(toKind(undefined)).toBeUndefined();
  });

  it('shows the kind buttons only where both kinds are', () => {
    expect(showKinds(null)).toBe(false);
    expect(showKinds(facets(3, 0))).toBe(false);
    expect(showKinds(facets(0, 2))).toBe(false);
    expect(showKinds(facets(3, 2))).toBe(true);
  });

  it('tells a currency apart from a denomination in the select', () => {
    expect(nominalSelection('Euro2')).toEqual({ denomination: 'Euro2', currency: null });
    expect(nominalSelection('currency:Mark')).toEqual({ denomination: null, currency: 'Mark' });
    expect(nominalSelection('')).toEqual({ denomination: null, currency: null });
  });

  it('offers what the chosen kind has', () => {
    expect(nominalOptions('Euro', facets(3, 2, ['Mark']), undefined)).toEqual({
      denominations: DENOMINATIONS,
      currencies: [],
      grouped: false,
    });
    expect(nominalOptions('Other', facets(3, 2, ['Mark']), undefined)).toEqual({
      denominations: [],
      currencies: ['Mark'],
      grouped: false,
    });
  });

  it('groups both kinds for every kind, and only then', () => {
    expect(nominalOptions(undefined, facets(3, 2, ['kuruş', 'Mark']), undefined).grouped).toBe(
      true,
    );
    expect(nominalOptions(undefined, facets(3, 0), undefined)).toEqual({
      denominations: DENOMINATIONS,
      currencies: [],
      grouped: false,
    });
    expect(nominalOptions(undefined, facets(0, 2, ['Mark']), undefined)).toEqual({
      denominations: [],
      currencies: ['Mark'],
      grouped: false,
    });
  });

  it('takes a list for euro coins until its facets are there, and keeps a currency from the URL', () => {
    expect(nominalOptions(undefined, null, undefined).denominations).toEqual(DENOMINATIONS);
    expect(nominalOptions('Other', null, 'Lira').currencies).toEqual(['Lira']);
    expect(nominalOptions('Other', facets(0, 1, ['Mark']), 'mark').currencies).toEqual(['Mark']);
  });
});
