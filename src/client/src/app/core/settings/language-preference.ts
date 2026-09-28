import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { LanguageService } from '../i18n/language.service';
import { Language } from '../i18n/languages';
import { SettingsService } from './settings.service';

/**
 * A language chosen by the user (footer, settings page). Signed in, it is saved to the account
 * first, so every device follows; signed out, it is only remembered on this browser.
 * Rejects when saving fails; the active language then stays as it was.
 */
@Injectable({ providedIn: 'root' })
export class LanguagePreference {
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private readonly language = inject(LanguageService);

  async change(lang: Language): Promise<void> {
    if (this.auth.isAuthenticated()) {
      await firstValueFrom(this.settings.update({ language: lang }));
    }
    await this.language.use(lang);
  }
}
