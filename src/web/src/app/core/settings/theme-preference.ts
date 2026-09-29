import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { ThemeMode, ThemeService } from '../theme/theme.service';
import { SettingsService } from './settings.service';

/**
 * A theme chosen by the user (navbar button, settings page). Unlike the language it is applied
 * at once, so the switch feels instant; signed in, it is then saved to the account. Rejects
 * when saving fails, after switching back to the previous theme.
 */
@Injectable({ providedIn: 'root' })
export class ThemePreference {
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private readonly theme = inject(ThemeService);

  async change(mode: ThemeMode): Promise<void> {
    const previous = this.theme.preference();
    this.theme.use(mode);
    if (!this.auth.isAuthenticated()) {
      return;
    }
    try {
      await firstValueFrom(this.settings.update({ theme: mode }));
    } catch (err) {
      this.theme.use(previous);
      throw err;
    }
  }
}
