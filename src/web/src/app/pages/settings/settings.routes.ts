import { Routes } from '@angular/router';

/** Sections of the settings page (menu: SECTIONS in settings.ts). */
export const SETTINGS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'profile' },
  {
    path: 'profile',
    loadComponent: () => import('./profile-settings').then((m) => m.ProfileSettings),
  },
  {
    path: 'appearance',
    loadComponent: () => import('./appearance-settings').then((m) => m.AppearanceSettings),
  },
  {
    path: 'account',
    loadComponent: () => import('./account-settings').then((m) => m.AccountSettings),
  },
  // Language was a section of its own before Appearance
  { path: 'language', redirectTo: 'appearance' },
];
