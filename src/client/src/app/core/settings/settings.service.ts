import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { Language } from '../i18n/languages';
import { ThemeMode } from '../theme/theme.service';

// Mirrors CoinPortal.Api/Contracts/Settings
export interface UserSettings {
  /** Null until the user chooses one; the UI then follows the device. */
  language: Language | null;
  /** Null until the user chooses one; the UI then follows this browser's last choice. */
  theme: ThemeMode | null;
}

/** The signed-in user's settings (api/settings). */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  get(): Observable<UserSettings> {
    return this.http.get<UserSettings>('/api/settings');
  }

  /**
   * Saves the given settings. The API replaces all of them, so the others are sent as the
   * current user has them. The current user is updated too, so the header and others agree.
   */
  update(changes: Partial<UserSettings>): Observable<UserSettings> {
    const user = this.auth.currentUser();
    const settings: UserSettings = {
      language: user?.language ?? null,
      theme: user?.theme ?? null,
      ...changes,
    };
    return this.http
      .put<UserSettings>('/api/settings', settings)
      .pipe(tap((saved) => this.auth.patchUser({ language: saved.language, theme: saved.theme })));
  }
}
