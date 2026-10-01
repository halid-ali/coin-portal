import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, forkJoin, from, map, switchMap, tap } from 'rxjs';

import { LanguageService } from '../i18n/language.service';
import { AccentService } from '../theme/accent.service';
import { ThemeService } from '../theme/theme.service';
import { ADMIN_ROLE, LoginRequest, RegisterRequest, UserResponse } from './auth.models';

const API = '/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);
  private readonly theme = inject(ThemeService);
  private readonly accent = inject(AccentService);

  private readonly user = signal<UserResponse | null>(null);

  /** The signed-in user, or null for anonymous visitors. */
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  /** Shows the admin panel link; the API checks the role on every admin request. */
  readonly isAdmin = computed(() => this.user()?.roles.includes(ADMIN_ROLE) ?? false);

  /**
   * Called once at startup (provideAppInitializer): restores the session from the
   * auth cookie and fetches an antiforgery token that matches that session.
   * Never throws, so the app still boots when the API is down.
   */
  async init(): Promise<void> {
    await this.loadMe();
    await firstValueFrom(this.refreshXsrfToken()).catch((err) =>
      console.warn('Could not fetch antiforgery token', err),
    );
  }

  /** Loads the current user from the API; resolves to null when not signed in. */
  async loadMe(): Promise<UserResponse | null> {
    try {
      const me = await firstValueFrom(this.http.get<UserResponse>(`${API}/me`));
      this.user.set(me);
    } catch (err) {
      if (!(err instanceof HttpErrorResponse && err.status === 401)) {
        console.warn('Could not load current user', err);
      }
      this.user.set(null);
    }
    return this.user();
  }

  /** The current UI language goes along: it becomes the account's saved language. */
  register(request: Omit<RegisterRequest, 'language'>): Observable<UserResponse> {
    return this.http
      .post<UserResponse>(`${API}/register`, { ...request, language: this.language.current() })
      .pipe(switchMap((user) => this.completeSignIn(user)));
  }

  login(request: LoginRequest): Observable<UserResponse> {
    return this.http
      .post<UserResponse>(`${API}/login`, request)
      .pipe(switchMap((user) => this.completeSignIn(user)));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API}/logout`, null).pipe(
      tap(() => this.user.set(null)),
      // The old token was bound to the signed-in user, get an anonymous one
      switchMap(() => this.refreshXsrfToken()),
    );
  }

  /** Signed out by deleting the account (SettingsService.deleteAccount): like logout, without the request. */
  afterAccountDeleted(): Observable<void> {
    this.user.set(null);
    return this.refreshXsrfToken();
  }

  /** Keeps the current user in step after a change elsewhere (e.g. the settings page). */
  patchUser(changes: Partial<UserResponse>): void {
    this.user.update((user) => user && { ...user, ...changes });
  }

  /** Used by the interceptor when the API answers 401 (e.g. the cookie expired). */
  handleSessionExpired(): void {
    if (this.user() === null) {
      return;
    }
    this.user.set(null);
    this.refreshXsrfToken().subscribe({ error: () => undefined });
  }

  /**
   * Asks the API to issue a fresh XSRF-TOKEN cookie. Antiforgery tokens are bound
   * to the user identity, so this must run after every sign-in and sign-out.
   */
  private refreshXsrfToken(): Observable<void> {
    return this.http.get<void>(`${API}/antiforgery`);
  }

  /** The account's saved language, theme and accent win over the ones chosen on this device. */
  private completeSignIn(user: UserResponse): Observable<UserResponse> {
    this.user.set(user);
    if (user.theme) {
      this.theme.use(user.theme);
    }
    if (user.accent) {
      this.accent.use(user.accent);
    }
    const language = user.language ? this.language.use(user.language) : Promise.resolve();
    return forkJoin([this.refreshXsrfToken(), from(language)]).pipe(map(() => user));
  }
}
