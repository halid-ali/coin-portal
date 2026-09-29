import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';

// Titles are translation keys, see TranslatedTitleStrategy (no title: just the app name)
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    title: 'titles.login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'titles.register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {
    path: 'collections',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: 'titles.collections',
        loadComponent: () => import('./pages/collections/collections').then((m) => m.Collections),
      },
      {
        path: ':collectionId',
        title: 'titles.collection',
        data: { mode: 'owner' },
        loadComponent: () => import('./pages/collection/collection').then((m) => m.Collection),
      },
    ],
  },
  // Shared views: no sign-in needed, read-only (route data "mode" feeds the Collection page)
  {
    path: 'explore',
    title: 'titles.explore',
    data: { mode: 'explore' },
    loadComponent: () => import('./pages/collection/collection').then((m) => m.Collection),
  },
  {
    path: 'u/:userName',
    title: 'titles.profile',
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'u/:userName/:collectionId',
    title: 'titles.collection',
    data: { mode: 'public' },
    loadComponent: () => import('./pages/collection/collection').then((m) => m.Collection),
  },
  {
    path: 's/:token',
    title: 'titles.sharedCollection',
    data: { mode: 'shared' },
    loadComponent: () => import('./pages/collection/collection').then((m) => m.Collection),
  },
  {
    path: 'coins',
    canActivate: [authGuard],
    children: [
      {
        // ?collection=<id> preselects the collection
        path: 'new',
        title: 'titles.newCoin',
        loadComponent: () => import('./pages/coin-form/coin-form').then((m) => m.CoinForm),
      },
      {
        path: ':id/edit',
        title: 'titles.editCoin',
        loadComponent: () => import('./pages/coin-form/coin-form').then((m) => m.CoinForm),
      },
    ],
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    title: 'titles.settings',
    loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings),
    loadChildren: () => import('./pages/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
  },
  // Addresses from before multiple collections (bookmarks)
  { path: 'collection', pathMatch: 'full', redirectTo: 'collections' },
  { path: 'collection/new', redirectTo: 'coins/new' },
  { path: 'collection/:id/edit', redirectTo: 'coins/:id/edit' },
  { path: '**', redirectTo: '' },
];
