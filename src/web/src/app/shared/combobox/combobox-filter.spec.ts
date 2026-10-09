import { ComboboxOption, filterOptions, fold, rank } from './combobox-filter';

const COUNTRIES: ComboboxOption[] = [
  'Antigua ve Barbuda',
  'Bulgaristan',
  'Burundi',
  'Cibuti',
  'Güney Kore',
  'Kuzey Kore',
  'Lüksemburg',
  'Myanmar (Burma)',
  'Türkiye',
].map((label) => ({ value: label, label }));

const labels = (typed: string, options = COUNTRIES) =>
  filterOptions(options, typed).flatMap((g) => g.matches.map((m) => m.option.label));

describe('fold', () => {
  it('drops case and accents, Turkish dotted and dotless i alike', () => {
    expect(fold('Türkiye')).toBe('turkiye');
    expect(fold('İsveç')).toBe('isvec');
    expect(fold('IŞIK ışık')).toBe('isik isik');
    expect(fold('Ελλάδα')).toBe('ελλαδα');
  });

  it('keeps one character per character, so positions stay', () => {
    for (const text of ['Çekya', 'İzlanda', 'Ñandú', 'Nordmazedonien ß', 'Нидерландия']) {
      expect(fold(text)).toHaveLength(text.length);
    }
  });
});

describe('rank', () => {
  it('starts with, then a word starts with, then contains', () => {
    expect(rank('Bulgaristan', 'bu')).toEqual({ tier: 0, at: 0 });
    expect(rank('Myanmar (Burma)', 'bu')).toEqual({ tier: 1, at: 9 });
    expect(rank('Güney Kore', 'kore')).toEqual({ tier: 1, at: 6 });
    expect(rank('Cibuti', 'bu')).toEqual({ tier: 2, at: 2 });
    expect(rank('Türkiye', 'bu')).toBeNull();
  });

  it('matches without accents and case', () => {
    expect(rank('Türkiye', 'TURK')).toEqual({ tier: 0, at: 0 });
    expect(rank('Lüksemburg', 'lux')).toBeNull();
    expect(rank('Lüksemburg', 'luks')).toEqual({ tier: 0, at: 0 });
  });
});

describe('filterOptions', () => {
  it('lists every option in its order without text', () => {
    expect(labels('')).toEqual(COUNTRIES.map((c) => c.label));
    expect(labels('   ')).toEqual(COUNTRIES.map((c) => c.label));
  });

  it('puts the better matches first, in their order within a tier', () => {
    expect(labels('bu')).toEqual([
      'Bulgaristan',
      'Burundi',
      'Myanmar (Burma)',
      'Antigua ve Barbuda',
      'Cibuti',
      'Lüksemburg',
    ]);
    expect(labels('kore')).toEqual(['Güney Kore', 'Kuzey Kore']);
    expect(labels('xyz')).toEqual([]);
  });

  it('marks the matching part, the typed text trimmed', () => {
    const [group] = filterOptions(COUNTRIES, ' bu ');
    expect(group.matches.map((m) => [m.option.label, m.at, m.length])).toContainEqual([
      'Cibuti',
      2,
      2,
    ]);
    expect(filterOptions(COUNTRIES, '')[0].matches[0].at).toBe(-1);
  });

  it('keeps the groups in order and leaves out the empty ones', () => {
    const options: ComboboxOption[] = [
      { value: '', label: 'Tümü' },
      { value: 'Euro2', label: '2 €', group: 'Euro coin' },
      { value: 'Cent50', label: '50 cent', group: 'Euro coin' },
      { value: 'currency:penny', label: 'penny', group: 'Diğer coin' },
      { value: 'currency:kopek', label: 'kopek', group: 'Diğer coin' },
    ];

    expect(filterOptions(options, '').map((g) => [g.label, g.matches.length])).toEqual([
      [null, 1],
      ['Euro coin', 2],
      ['Diğer coin', 2],
    ]);
    expect(
      filterOptions(options, 'pe').map((g) => [g.label, g.matches.map((m) => m.option.label)]),
    ).toEqual([['Diğer coin', ['penny', 'kopek']]]);
  });
});
