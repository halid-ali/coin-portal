import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AccentColor, AccentService } from '../theme/accent.service';
import { SettingsService } from './settings.service';

/**
 * An accent color chosen by the user (settings page). Like the theme it is applied at once;
 * signed in, it is then saved to the account. Rejects when saving fails, after switching back
 * to the previous color.
 */
@Injectable({ providedIn: 'root' })
export class AccentPreference {
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private readonly accent = inject(AccentService);

  async change(accent: AccentColor): Promise<void> {
    const previous = this.accent.current();
    this.accent.use(accent);
    if (!this.auth.isAuthenticated()) {
      return;
    }
    try {
      await firstValueFrom(this.settings.update({ accent }));
    } catch (err) {
      this.accent.use(previous);
      throw err;
    }
  }
}
