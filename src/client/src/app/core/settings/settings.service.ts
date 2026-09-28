import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { Language } from '../i18n/languages';

// Mirrors CoinPortal.Api/Contracts/Settings
export interface UserSettings {
  /** Null until the user chooses one; the UI then follows the device. */
  language: Language | null;
}

/** The signed-in user's settings (api/settings). */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  get(): Observable<UserSettings> {
    return this.http.get<UserSettings>('/api/settings');
  }

  /** Saves all settings; the current user is updated too, so the header and others agree. */
  update(settings: UserSettings): Observable<UserSettings> {
    return this.http
      .put<UserSettings>('/api/settings', settings)
      .pipe(tap((saved) => this.auth.patchUser({ language: saved.language })));
  }
}
