import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'tenants',
        loadComponent: () => import('./pages/tenants/tenants').then((m) => m.TenantsPage),
      },
      {
        path: 'plans',
        loadComponent: () => import('./pages/plans/plans').then((m) => m.PlansPage),
      },
      {
        path: 'subscriptions',
        loadComponent: () => import('./pages/subscriptions/subscriptions').then((m) => m.SubscriptionsPage),
      },
      {
        path: 'migrations',
        loadComponent: () => import('./pages/migrations/migrations').then((m) => m.MigrationsPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
