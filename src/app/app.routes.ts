import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';
import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // Public routes will go here
    ]
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./core/auth/pages/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./core/auth/pages/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'logout',
        loadComponent: () => import('./core/auth/pages/logout/logout.component').then(m => m.LogoutComponent)
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: 'admin',
    component: DashboardLayoutComponent,
    canActivate: [authGuard], // Protection de la route parente
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'biens',
        loadComponent: () => import('./features/biens/biens.component').then(m => m.BiensComponent)
      },
      {
        path: 'contrats',
        loadComponent: () => import('./features/contrats/contrats.component').then(m => m.ContratsComponent)
      },
      {
        path: 'messagerie',
        loadComponent: () => import('./features/messagerie/messagerie.component').then(m => m.MessagerieComponent)
      }
    ]
  },
  {
    path: 'user',
    component: DashboardLayoutComponent,
    canActivate: [authGuard], // Protection de la route parente
    children: [
       {
        path: '',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'messagerie',
        loadComponent: () => import('./features/messagerie/messagerie.component').then(m => m.MessagerieComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
