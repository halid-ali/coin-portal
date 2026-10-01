import { Translation } from '@jsverse/transloco';

import { LANGUAGES, Language } from './languages';
import { ADMIN_TRANSLATIONS, TRANSLATIONS } from './testing';

type Leaves = Map<string, string>;

/** "a.b.c" -> text for every string in the file. */
function leaves(node: Translation, prefix = '', out: Leaves = new Map()): Leaves {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out.set(path, value);
    } else {
      leaves(value as Translation, path, out);
    }
  }
  return out;
}

/** Plural entries: objects whose keys are all plural categories, e.g. { one, other }. */
function pluralKeys(node: Translation, prefix = '', out: string[] = []): string[] {
  for (const [key, value] of Object.entries(node)) {
    if (typeof value !== 'object') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if ('other' in value) out.push(path);
    else pluralKeys(value as Translation, path, out);
  }
  return out;
}

const params = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

const others = LANGUAGES.map((l) => l.code).filter((code) => code !== 'tr');

// The app's files and the admin panel's scope; in each, Turkish is the source language and
// every other file must match it exactly
describe.each([
  ['translation files', TRANSLATIONS],
  ['admin translation files', ADMIN_TRANSLATIONS],
] as const)('%s', (_name, files) => {
  const source = leaves(files.tr);

  it.each(others)('%s has exactly the keys of tr', (lang) => {
    const keys = [...leaves(files[lang]).keys()].sort();
    // Plural forms may differ per language, so compare the entries above them
    const strip = (k: string) => k.replace(/\.(zero|one|two|few|many|other)$/, '');
    expect([...new Set(keys.map(strip))]).toEqual([
      ...new Set([...source.keys()].sort().map(strip)),
    ]);
  });

  it.each(LANGUAGES.map((l) => l.code))(
    '%s texts are non-empty and keep the parameters',
    (lang) => {
      for (const [key, text] of leaves(files[lang])) {
        expect(text.trim(), key).not.toBe('');
        const base = key.replace(/\.(zero|one|two|few|many)$/, '.other');
        expect(params(text), `${lang}: ${key}`).toEqual(params(source.get(base) ?? text));
      }
    },
  );

  it.each(LANGUAGES.map((l) => l.code))('%s has every plural form the language needs', (lang) => {
    const categories = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
    for (const key of pluralKeys(files[lang as Language])) {
      const node = key.split('.').reduce((o, k) => o[k] as Translation, files[lang]);
      for (const category of categories) {
        expect(node[category], `${lang}: ${key}.${category}`).toBeTypeOf('string');
      }
    }
  });
});
