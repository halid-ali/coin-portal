import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, firstValueFrom, from, switchMap, tap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { Language } from '../i18n/languages';
import { AccentColor } from '../theme/accent.service';
import { ThemeMode } from '../theme/theme.service';

// Mirrors src/api/Contracts/Settings
export interface UserSettings {
  /** Null until the user chooses one; the UI then follows the device. */
  language: Language | null;
  /** Null until the user chooses one; the UI then follows this browser's last choice. */
  theme: ThemeMode | null;
  /** Null until the user chooses one; the UI then follows this browser's last choice. */
  accent: AccentColor | null;
}

/** The user's photo storage (GET api/settings/storage). */
export interface PhotoStorage {
  /** Coin photos and collection covers together, as the quota counts them. */
  usedBytes: number;
  /** The limit every user has; used may be above it after an admin lowered it. */
  quotaBytes: number;
}

/**
 * The data export (a ZIP). A plain link: the browser's download manager streams it, so a large
 * file never sits in the page's memory.
 */
export const ACCOUNT_EXPORT_URL = '/api/settings/export';

/** Navigation state the home page reads after the account was deleted (one-time notice). */
export const ACCOUNT_DELETED_STATE = { notice: 'accountDeleted' } as const;

/** The signed-in user's settings (api/settings). */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  /** The last queued update; the next one starts after it (see update). */
  private queue: Promise<unknown> = Promise.resolve();

  get(): Observable<UserSettings> {
    return this.http.get<UserSettings>('/api/settings');
  }

  storage(): Observable<PhotoStorage> {
    return this.http.get<PhotoStorage>('/api/settings/storage');
  }

  /**
   * Saves the given settings. The API replaces all of them, so the others are sent as the
   * current user has them. The current user is updated too, so the header and others agree.
   * Updates go one after another: one started while another is on its way (theme, then accent)
   * is sent once that one is saved, with its result, so neither overwrites the other.
   */
  update(changes: Partial<UserSettings>): Observable<UserSettings> {
    return defer(() => {
      const saved = this.queue.then(() => firstValueFrom(this.put(changes)));
      // A failed update does not stop the ones after it
      this.queue = saved.catch(() => undefined);
      return from(saved);
    });
  }

  private put(changes: Partial<UserSettings>): Observable<UserSettings> {
    const user = this.auth.currentUser();
    const settings: UserSettings = {
      language: user?.language ?? null,
      theme: user?.theme ?? null,
      accent: user?.accent ?? null,
      ...changes,
    };
    return this.http
      .put<UserSettings>('/api/settings', settings)
      .pipe(tap(({ language, theme, accent }) => this.auth.patchUser({ language, theme, accent })));
  }

  /**
   * Deletes the account with everything in it; the API checks the password and signs out.
   * Errors: 400 code wrong_password, 403 code admin_account, 423 (too many wrong passwords).
   */
  deleteAccount(password: string): Observable<void> {
    return this.http
      .delete<void>('/api/settings/account', { body: { password } })
      .pipe(switchMap(() => this.auth.afterAccountDeleted()));
  }
}
