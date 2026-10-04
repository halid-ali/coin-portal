import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { adminGuard, guestGuard } from './auth.guards';
import { AuthService } from './auth.service';

describe('adminGuard', () => {
  function run(user: 'anonymous' | 'user' | 'admin'): boolean | UrlTree {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: signal(user !== 'anonymous'),
            isAdmin: signal(user === 'admin'),
          },
        },
      ],
    });
    return TestBed.runInInjectionContext(
      () =>
        adminGuard({} as ActivatedRouteSnapshot, { url: '/admin/users' } as RouterStateSnapshot) as
          boolean | UrlTree,
    );
  }

  const url = (result: boolean | UrlTree) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('lets admins in', () => {
    expect(run('admin')).toBe(true);
  });

  it('sends other users home', () => {
    expect(url(run('user'))).toBe('/');
  });

  it('sends signed-out visitors to sign in, then back', () => {
    expect(url(run('anonymous'))).toBe('/login?returnUrl=%2Fadmin%2Fusers');
  });
});

describe('guestGuard', () => {
  function run(signedIn: boolean, returnUrl?: string): boolean | UrlTree {
    // Called more than once in a test
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: signal(signedIn) } },
      ],
    });
    const route = {
      queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}),
    } as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(
      () => guestGuard(route, { url: '/login' } as RouterStateSnapshot) as boolean | UrlTree,
    );
  }

  const url = (result: boolean | UrlTree) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('shows the sign-in page to signed-out visitors', () => {
    expect(run(false, '/collections/5')).toBe(true);
  });

  it('sends signed-in users where the sign-in link was going', () => {
    expect(url(run(true, '/collections/5?view=grid'))).toBe('/collections/5?view=grid');
  });

  it('sends signed-in users home without a safe return address', () => {
    expect(url(run(true))).toBe('/');
    expect(url(run(true, '//evil.example'))).toBe('/');
    expect(url(run(true, 'https://evil.example'))).toBe('/');
  });
});
