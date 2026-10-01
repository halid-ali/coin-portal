/**
 * Who runs the site, shown on the privacy and contact pages (the GDPR controller). Null until
 * filled in before the first release: the pages then say so ("legal.notSet"). See PROJECT_STATUS
 * "Yayın öncesi yapılacaklar".
 */
export const OPERATOR: { readonly name: string | null; readonly email: string | null } = {
  name: null,
  email: null,
};

/** The public repository (source code, bug reports). */
export const SOURCE_URL = 'https://github.com/halid-ali/coin-portal';

/** Date of the privacy policy's current text (ISO); changed with the text. */
export const PRIVACY_UPDATED = '2026-10-01';
