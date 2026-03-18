import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';
import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [

      // PAGE PUBLIQUE — sans guard
      {
        path: '',
        loadComponent: () => import('./features/biens/biens.component').then(m => m.BiensComponent)
      },

      // AUTH
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
            path: 'reset-password',
            loadComponent: () => import('./core/auth/pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
          },
          { path: '', redirectTo: 'login', pathMatch: 'full' }
        ]
      },

      // PROPRIÉTAIRE
      {
        path: 'pro',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            loadComponent: () => import('./features/biens/biens.component').then(m => m.BiensComponent)
          },
          {
            path: 'biens',
            loadComponent: () => import('./features/biens/biens.component').then(m => m.BiensComponent)
          },
          {
            path: 'biens/nouveau',
            loadComponent: () => import('./features/biens/pages/bien-create/bien-create.component').then(m => m.BienCreateComponent)
          },
          {
            path: 'biens/:id',
            loadComponent: () => import('./features/biens/pages/bien-detail/bien-detail.component').then(m => m.BienDetailComponent)
          },
          {
            path: 'contrats',
            loadComponent: () => import('./features/contrats/contrats.component').then(m => m.ContratsComponent)
          },
          {
            path: 'etats-des-lieux',
            loadComponent: () => import('./features/etats-des-lieux/etats-des-lieux.component').then(m => m.EtatsDesLieuxComponent)
          },
          {
            path: 'quittances',
            loadComponent: () => import('./features/quittances/quittances.component').then(m => m.QuittancesComponent)
          },
          {
            path: 'messagerie',
            loadComponent: () => import('./features/messagerie/messagerie.component').then(m => m.MessagerieComponent)
          }
        ]
      },

      // LOCATAIRE
      {
        path: 'loc',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            loadComponent: () => import('./features/biens/biens.component').then(m => m.BiensComponent)
          },
          {
            path: 'contrats',
            loadComponent: () => import('./features/contrats/contrats.component').then(m => m.ContratsComponent)
          },
          {
            path: 'etats-des-lieux',
            loadComponent: () => import('./features/etats-des-lieux/etats-des-lieux.component').then(m => m.EtatsDesLieuxComponent)
          },
          {
            path: 'quittances',
            loadComponent: () => import('./features/quittances/quittances.component').then(m => m.QuittancesComponent)
          },
          {
            path: 'messagerie',
            loadComponent: () => import('./features/messagerie/messagerie.component').then(m => m.MessagerieComponent)
          }
        ]
      },

      // ACCOUNT (les deux rôles)
      {
        path: 'account',
        canActivate: [authGuard],
        children: [
          {
            path: 'private/home',
            loadComponent: () => import('./features/account/private/profile-home/profile-home.component').then(m => m.ProfileHomeComponent)
          },
          {
            path: 'settings',
            loadComponent: () => import('./features/account/private/account-settings/account-settings.component').then(m => m.AccountSettingsComponent)
          }
        ]
      },

      // DÉTAIL BIEN partagé — accessible à tout utilisateur connecté
      {
        path: 'biens/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./features/biens/pages/bien-detail/bien-detail.component').then(m => m.BienDetailComponent)
      },

      { path: '**', redirectTo: '' }
    ]
  }
];
