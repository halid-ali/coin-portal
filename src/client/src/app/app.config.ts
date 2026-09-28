import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { LanguageService } from './core/i18n/language.service';
import { DEFAULT_LANGUAGE, LANGUAGES } from './core/i18n/languages';
import { TranslatedTitleStrategy } from './core/i18n/translated-title-strategy';
import { TranslationLoader } from './core/i18n/translation-loader';
import { ThemeService } from './core/theme/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    provideTransloco({
      config: {
        availableLangs: LANGUAGES.map((l) => l.code),
        defaultLang: DEFAULT_LANGUAGE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslationLoader,
    }),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor]),
      // Angular reads this cookie and sends it back as a header on POST/PUT/DELETE
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    // Before the first navigation: restore the session so guards see the right state, then
    // load the language (the account's, otherwise this device's) so no page shows raw keys.
    // The account's theme wins too; otherwise ThemeService keeps this browser's choice
    provideAppInitializer(async () => {
      const auth = inject(AuthService);
      const language = inject(LanguageService);
      const theme = inject(ThemeService);
      await auth.init();
      const savedTheme = auth.currentUser()?.theme;
      if (savedTheme) {
        theme.use(savedTheme);
      }
      await language.use(auth.currentUser()?.language ?? language.deviceLanguage());
    }),
  ],
};
