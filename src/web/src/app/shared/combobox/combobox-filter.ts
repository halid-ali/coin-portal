/** One choice of a combobox. */
export interface ComboboxOption {
  value: string;
  /** What the list shows and what typing is matched against, in the active language. */
  label: string;
  /** Heading the option is listed under (e.g. "Euro coin"); options of a group stay together. */
  group?: string;
}

/** An option that matches the typed text, and where: `at` / `length` mark the matching part. */
export interface ComboboxMatch {
  option: ComboboxOption;
  at: number;
  length: number;
}

export interface ComboboxGroup {
  /** Null for options without a group. */
  label: string | null;
  matches: ComboboxMatch[];
}

/**
 * Lower case without accents, one character per character (so positions in the folded text are
 * positions in the label): "Türkiye" → "turkiye", "İsveç" → "isvec", "ı" → "i".
 */
export function fold(text: string): string {
  let folded = '';
  for (const unit of text.split('')) {
    if (unit === 'I' || unit === 'İ' || unit === 'ı') {
      folded += 'i';
      continue;
    }
    const lower = unit.toLowerCase();
    folded += lower.length === 1 ? (lower.normalize('NFD')[0] ?? lower) : unit;
  }
  return folded;
}

const WORD_CHARACTER = /[\p{L}\p{N}]/u;

/**
 * How well a label matches (user choice 2026-10-09): 0 starts with the text, 1 one of its words
 * starts with it ("kore" → "Güney Kore"), 2 contains it; null for no match. `at` is where.
 */
export function rank(label: string, typed: string): { tier: number; at: number } | null {
  const name = fold(label);
  const text = fold(typed);
  if (name.startsWith(text)) {
    return { tier: 0, at: 0 };
  }
  for (let i = 1; i < name.length; i++) {
    if (!WORD_CHARACTER.test(name[i - 1]) && name.startsWith(text, i)) {
      return { tier: 1, at: i };
    }
  }
  const at = name.indexOf(text);
  return at >= 0 ? { tier: 2, at } : null;
}

/**
 * The options to list for the typed text, by group (in the order the groups first appear). Without
 * text every option, in its order; with text only the matches, the better ones first and in their
 * order within a tier (countries come sorted by name, denominations by value). Empty groups are left out.
 */
export function filterOptions(options: readonly ComboboxOption[], typed: string): ComboboxGroup[] {
  const text = typed.trim();
  const groups = new Map<string | null, (ComboboxMatch & { tier: number })[]>();
  for (const option of options) {
    const key = option.group ?? null;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    const found = text ? rank(option.label, text) : { tier: 0, at: -1 };
    if (found) {
      groups.get(key)!.push({ option, tier: found.tier, at: found.at, length: text.length });
    }
  }
  return [...groups]
    .filter(([, matches]) => matches.length > 0)
    .map(([label, matches]) => ({
      label,
      matches: matches
        .sort((a, b) => a.tier - b.tier)
        .map(({ option, at, length }) => ({ option, at, length })),
    }));
}
