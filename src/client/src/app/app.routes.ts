import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Coin Portal',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    title: 'Giriş yap · Coin Portal',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Kayıt ol · Coin Portal',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {
    path: 'collection',
    title: 'Koleksiyonum · Coin Portal',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/collection/collection').then((m) => m.Collection),
  },
  { path: '**', redirectTo: '' },
];