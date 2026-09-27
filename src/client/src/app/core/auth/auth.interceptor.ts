import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

// 401 is an expected answer for these endpoints and must not end the session
const IGNORED_URLS = ['/api/auth/me', '/api/auth/login'];

/** Resets the session and redirects to /login when the API answers 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      const ignored = IGNORED_URLS.some((url) => req.url.startsWith(url));

      if (err instanceof HttpErrorResponse && err.status === 401 && !ignored) {
        const wasSignedIn = auth.isAuthenticated();
        auth.handleSessionExpired();

        if (wasSignedIn) {
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      }

      return throwError(() => err);
    }),
  );
};