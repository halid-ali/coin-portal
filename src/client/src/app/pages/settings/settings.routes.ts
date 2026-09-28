import { Routes } from '@angular/router';

/** Sections of the settings page (menu: SECTIONS in settings.ts). */
export const SETTINGS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'language' },
  {
    path: 'language',
    loadComponent: () => import('./language-settings').then((m) => m.LanguageSettings),
  },
];
