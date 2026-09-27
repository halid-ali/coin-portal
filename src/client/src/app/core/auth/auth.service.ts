import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, map, switchMap, tap } from 'rxjs';

import { LoginRequest, RegisterRequest, UserResponse } from './auth.models';

const API = '/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly user = signal<UserResponse | null>(null);

  /** The signed-in user, or null for anonymous visitors. */
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

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

  register(request: RegisterRequest): Observable<UserResponse> {
    return this.http
      .post<UserResponse>(`${API}/register`, request)
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

  private completeSignIn(user: UserResponse): Observable<UserResponse> {
    this.user.set(user);
    return this.refreshXsrfToken().pipe(map(() => user));
  }
}