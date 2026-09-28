/** UI languages (ISO 639-1). Same list as the API (Localization/SupportedLanguages.cs). */
export type Language = 'en' | 'tr' | 'de' | 'bg';

/** Used when neither the account, this browser nor the browser language picks one. */
export const DEFAULT_LANGUAGE: Language = 'en';

/** In the order shown in pickers; names in their own language, so everyone finds theirs. */
export const LANGUAGES: readonly { code: Language; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'bg', name: 'Български' },
];

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l.code === value);
}

/** First supported language in the browser's preference list ("de-AT" counts as "de"). */
export function matchBrowserLanguage(preferred: readonly string[]): Language | null {
  for (const tag of preferred) {
    const code = tag.toLowerCase().split('-')[0];
    if (isLanguage(code)) {
      return code;
    }
  }
  return null;
}
