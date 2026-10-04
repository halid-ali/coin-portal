import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { safeReturnUrl } from './return-url';

/** Lets only signed-in users through; others go to /login with a return URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * The admin panel: admins only. Signed-out visitors go to /login, other users to the home page.
 * Only spares a useless page: the API checks the role on every admin request.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return auth.isAdmin() ? true : router.createUrlTree(['/']);
};

/**
 * Keeps signed-in users away from the login and register pages. An old sign-in link (or one
 * signed in meanwhile in another tab) still leads to where it was going.
 */
export const guestGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated()
    ? router.parseUrl(safeReturnUrl(route.queryParamMap.get('returnUrl')))
    : true;
};
