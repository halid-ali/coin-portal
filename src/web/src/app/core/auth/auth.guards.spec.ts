import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { adminGuard } from './auth.guards';
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
