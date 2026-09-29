// Replaced at build time by release builds: ng build --define "APP_VERSION='0.1.0'"
declare const APP_VERSION: string | undefined;

/**
 * Release version of this client bundle, baked in at build time from the Git tag. Empty in
 * development and tests. `/api/health` reports the API's version; if the two differ after a
 * deployment, one side was not updated.
 */
export const appVersion: string = typeof APP_VERSION === 'string' ? APP_VERSION : '';
