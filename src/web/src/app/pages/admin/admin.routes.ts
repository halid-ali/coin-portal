import { Routes } from '@angular/router';

/** Sections of the admin panel (menu: SECTIONS in admin.ts). */
export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  {
    path: 'overview',
    loadComponent: () => import('./admin-overview').then((m) => m.AdminOverview),
  },
  {
    path: 'users',
    loadComponent: () => import('./admin-users').then((m) => m.AdminUsers),
  },
  {
    path: 'users/:id',
    loadComponent: () => import('./admin-user-detail').then((m) => m.AdminUserDetailPage),
  },
  {
    path: 'collections',
    loadComponent: () => import('./admin-collections').then((m) => m.AdminCollections),
  },
  {
    path: 'audit',
    loadComponent: () => import('./admin-audit').then((m) => m.AdminAudit),
  },
  {
    path: 'settings',
    loadComponent: () => import('./admin-settings').then((m) => m.AdminSettings),
  },
];
