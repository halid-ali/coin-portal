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
    path: 'collections',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: 'Koleksiyonlarım · Coin Portal',
        loadComponent: () => import('./pages/collections/collections').then((m) => m.Collections),
      },
      {
        path: ':collectionId',
        title: 'Koleksiyon · Coin Portal',
        loadComponent: () => import('./pages/collection/collection').then((m) => m.Collection),
      },
    ],
  },
  {
    path: 'coins',
    canActivate: [authGuard],
    children: [
      {
        // ?collection=<id> preselects the collection
        path: 'new',
        title: 'Coin ekle · Coin Portal',
        loadComponent: () => import('./pages/coin-form/coin-form').then((m) => m.CoinForm),
      },
      {
        path: ':id/edit',
        title: 'Coini düzenle · Coin Portal',
        loadComponent: () => import('./pages/coin-form/coin-form').then((m) => m.CoinForm),
      },
    ],
  },
  // Addresses from before multiple collections (bookmarks)
  { path: 'collection', pathMatch: 'full', redirectTo: 'collections' },
  { path: 'collection/new', redirectTo: 'coins/new' },
  { path: 'collection/:id/edit', redirectTo: 'coins/:id/edit' },
  { path: '**', redirectTo: '' },
];
