import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  firstValueFrom,
  forkJoin,
  from,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { LanguageService } from '../i18n/language.service';
import { AccentService } from '../theme/accent.service';
import { ThemeService } from '../theme/theme.service';
import {
  ADMIN_ROLE,
  LoginRequest,
  PasswordResetCheckResponse,
  RegisterRequest,
  UserResponse,
} from './auth.models';

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
   * Both at once, as the first paint waits for them: they carry the same cookie, so the token
   * belongs to the user that me returns (a rejected cookie is anonymous in both).
   */
  async init(): Promise<void> {
    await Promise.all([this.loadMe(), firstValueFrom(this.refreshAntiforgeryTokenQuietly())]);
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
      // The session was already over (cookie expired, account locked): signed out all the same
      catchError((err: unknown) =>
        err instanceof HttpErrorResponse && err.status === 401
          ? of(undefined)
          : throwError(() => err),
      ),
      tap(() => this.user.set(null)),
      // The old token was bound to the signed-in user, get an anonymous one
      switchMap(() => this.refreshAntiforgeryTokenQuietly()),
    );
  }

  /** Signed out by deleting the account (SettingsService.deleteAccount): like logout, without the request. */
  afterAccountDeleted(): Observable<void> {
    this.user.set(null);
    return this.refreshAntiforgeryTokenQuietly();
  }

  /**
   * Confirms an e-mail address with the secret from its verification link; signed out too (the
   * link may be opened on another device). A signed-in user is reloaded: the link may be theirs.
   */
  verifyEmail(token: string): Observable<void> {
    return this.http
      .post<void>(`${API}/verify-email`, { token })
      .pipe(
        switchMap(() =>
          this.user() ? from(this.loadMe()).pipe(map(() => undefined)) : of(undefined),
        ),
      );
  }

  /** Sends the verification link again (limited per user; 429 when asked too often). */
  resendVerificationEmail(): Observable<void> {
    return this.http.post<void>(`${API}/verify-email/resend`, null);
  }

  /**
   * "Forgot password": the account's address gets a reset link. The answer is the same whether an
   * account matched or not; the current UI language is the e-mail's when the account has none.
   */
  forgotPassword(userNameOrEmail: string): Observable<void> {
    return this.http.post<void>(`${API}/forgot-password`, {
      userNameOrEmail,
      language: this.language.current(),
    });
  }

  /** Whose password a reset link sets; 400 `invalid_token` when the link no longer works. */
  checkPasswordReset(token: string): Observable<PasswordResetCheckResponse> {
    return this.http.post<PasswordResetCheckResponse>(`${API}/reset-password/check`, { token });
  }

  /**
   * Sets the new password with a reset link. Every session of the account ends with it; a user
   * signed in here is signed out too, as the page leads to the sign-in with the new password.
   */
  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http
      .post<void>(`${API}/reset-password`, { token, newPassword })
      .pipe(switchMap(() => (this.user() ? this.logout() : of(undefined))));
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
    this.refreshAntiforgeryTokenQuietly().subscribe();
  }

  /**
   * Asks the API to issue a fresh XSRF-TOKEN cookie. Antiforgery tokens are bound
   * to the user identity, so this must run after every sign-in and sign-out.
   */
  refreshAntiforgeryToken(): Observable<void> {
    return this.http.get<void>(`${API}/antiforgery`);
  }

  /**
   * The token refresh after a sign-in or sign-out is a side request: when it fails, the main
   * action still succeeded. The next write request is then rejected once and retried with a
   * fresh token (authInterceptor).
   */
  private refreshAntiforgeryTokenQuietly(): Observable<void> {
    return this.refreshAntiforgeryToken().pipe(
      catchError((err: unknown) => {
        console.warn('Could not fetch antiforgery token', err);
        return of(undefined);
      }),
    );
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
    // Neither side request undoes the sign-in: without the account's language the current one stays
    const language = user.language
      ? this.language.use(user.language).catch((err: unknown) => {
          console.warn('Could not load the account language', err);
        })
      : Promise.resolve();
    return forkJoin([this.refreshAntiforgeryTokenQuietly(), from(language)]).pipe(map(() => user));
  }
}
