import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

/**
 * Translations are bundled as lazy chunks (src/i18n/<lang>.json): only the active language is
 * downloaded, and the hashed file names keep browser caches right after a deploy.
 */
@Injectable({ providedIn: 'root' })
export class TranslationLoader implements TranslocoLoader {
  async getTranslation(lang: string): Promise<Translation> {
    const module = await import(`../../../i18n/${lang}.json`);
    return module.default as Translation;
  }
}
