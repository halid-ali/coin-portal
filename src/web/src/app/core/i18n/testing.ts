import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Translation, TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { of } from 'rxjs';

import adminBg from '../../../i18n/admin/bg.json';
import adminDe from '../../../i18n/admin/de.json';
import adminEn from '../../../i18n/admin/en.json';
import adminTr from '../../../i18n/admin/tr.json';
import bg from '../../../i18n/bg.json';
import de from '../../../i18n/de.json';
import en from '../../../i18n/en.json';
import tr from '../../../i18n/tr.json';
import { LanguageService } from './language.service';
import { LANGUAGES, Language } from './languages';

// Spec helpers only (imported by *.spec.ts files, never by the app)

/** The real translation files, keyed by language. */
export const TRANSLATIONS: Record<Language, Translation> = { en, tr, de, bg };

/** The admin panel's translation scope (src/i18n/admin). */
export const ADMIN_TRANSLATIONS: Record<Language, Translation> = {
  en: adminEn,
  tr: adminTr,
  de: adminDe,
  bg: adminBg,
};

@Injectable()
class InlineLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of(TRANSLATIONS[lang as Language]);
  }
}

/** Transloco with the real translation files, loaded synchronously. */
export function provideTestTransloco() {
  return provideTransloco({
    config: {
      availableLangs: LANGUAGES.map((l) => l.code),
      defaultLang: 'en',
      reRenderOnLangChange: true,
      prodMode: true,
    },
    loader: InlineLoader,
  });
}

/**
 * Switches to `lang` (TestBed needs provideTestTransloco()), so texts and the translate()
 * helper work in specs. Specs mostly use Turkish, the source language.
 */
export async function useTestLanguage(lang: Language = 'tr'): Promise<void> {
  await TestBed.inject(LanguageService).use(lang);
}
