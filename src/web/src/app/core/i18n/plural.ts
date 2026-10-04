import { Pipe, PipeTransform, inject } from '@angular/core';
import { translate } from '@jsverse/transloco';

import { cachedIntl } from './intl-cache';
import { LanguageService } from './language.service';

type Params = Record<string, unknown>;

/**
 * Count-dependent text. The key holds one entry per plural category of the language
 * (Intl.PluralRules: "one", "other"; e.g. "{{count}} coin" / "{{count}} coins"), "other" is
 * the fallback. {{count}} is always available to the text.
 */
export function plural(key: string, count: number, lang: string, params: Params = {}): string {
  const category = cachedIntl(`plural|${lang}`, () => new Intl.PluralRules(lang)).select(count);
  const values = { count, ...params };
  const text = translate(`${key}.${category}`, values, lang);
  // Transloco returns the key itself when a translation is missing
  return text === `${key}.${category}` ? translate(`${key}.other`, values, lang) : text;
}

/** Template form of plural(): {{ 'common.coinCount' | plural: collection.coinCount }} */
@Pipe({ name: 'plural', pure: false })
export class PluralPipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(key: string, count: number, params?: Params): string {
    return plural(key, count, this.language.current(), params);
  }
}
