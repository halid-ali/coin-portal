import { Translation, provideTranslocoScope } from '@jsverse/transloco';

import { LANGUAGES } from '../i18n/languages';

/**
 * The panel's texts (src/i18n/admin/<lang>.json, keys under "admin."): their own lazy chunks, so
 * the language files every visitor downloads stay as they are. Provided on the /admin route.
 */
export function provideAdminTranslations() {
  return provideTranslocoScope({
    scope: 'admin',
    loader: Object.fromEntries(
      LANGUAGES.map(({ code }) => [
        code,
        () => import(`../../../i18n/admin/${code}.json`).then((m) => m.default as Translation),
      ]),
    ),
  });
}
