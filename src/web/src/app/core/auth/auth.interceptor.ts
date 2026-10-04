import {
  HttpContextToken,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpXsrfTokenExtractor,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

// 401 is an expected answer for these endpoints and must not end the session (a sign-out with
// an expired cookie still signs out, AuthService.logout)
const IGNORED_URLS = ['/api/auth/me', '/api/auth/login', '/api/auth/logout'];

/** Same header as withXsrfConfiguration in app.config.ts. */
const XSRF_HEADER = 'X-XSRF-TOKEN';

/** Set on the one retry after an antiforgery rejection, so it is not retried again. */
const ANTIFORGERY_RETRY = new HttpContextToken(() => false);

/**
 * The API's antiforgery check failed: a 400 to a write request with neither validation errors
 * nor a code. The token is missing (fetching it failed at startup) or belongs to another session
 * (e.g. another tab signed in or out).
 */
function isAntiforgeryRejection(req: HttpRequest<unknown>, err: HttpErrorResponse): boolean {
  if (err.status !== 400 || req.method === 'GET' || req.context.get(ANTIFORGERY_RETRY)) {
    return false;
  }
  const body = err.error as { errors?: unknown; code?: unknown } | null;
  return !body?.errors && !body?.code;
}

/**
 * Resets the session and redirects to /login when the API answers 401. After an antiforgery
 * rejection it fetches a token for the current session and sends the request once more.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const xsrf = inject(HttpXsrfTokenExtractor);

  const send = (request: HttpRequest<unknown>, handler: HttpHandlerFn): Observable<unknown> =>
    handler(request).pipe(
      catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
          return throwError(() => err);
        }

        if (isAntiforgeryRejection(request, err)) {
          return auth.refreshAntiforgeryToken().pipe(
            // Fetching the token failed too: report the original rejection
            catchError(() => throwError(() => err)),
            switchMap(() => {
              // The XSRF interceptor runs before this one and has set the old token already
              const token = xsrf.getToken();
              const retry = request.clone({
                context: request.context.set(ANTIFORGERY_RETRY, true),
                setHeaders: token ? { [XSRF_HEADER]: token } : {},
              });
              return send(retry, handler);
            }),
          );
        }

        const ignored = IGNORED_URLS.some((url) => request.url.startsWith(url));
        if (err.status === 401 && !ignored) {
          const wasSignedIn = auth.isAuthenticated();
          auth.handleSessionExpired();

          if (wasSignedIn) {
            router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          }
        }

        return throwError(() => err);
      }),
    );

  return send(req, next) as ReturnType<HttpInterceptorFn>;
};
