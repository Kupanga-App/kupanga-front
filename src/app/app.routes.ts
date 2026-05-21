import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';
import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  // ── AUTH — layout Direction C, aucun dashboard shell ──────────────────────
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./core/auth/pages/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./core/auth/pages/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./core/auth/pages/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'forgot',
        loadComponent: () =>
          import('./core/auth/pages/forgot-password/forgot-password.component').then(
            m => m.ForgotPasswordComponent
          )
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./core/auth/pages/reset-password/reset-password.component').then(
            m => m.ResetPasswordComponent
          )
      },
      {
        path: 'google-role',
        loadComponent: () =>
          import('./core/auth/pages/complete-profile/complete-profile.component').then(
            m => m.CompleteProfileComponent
          )
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // ── MAIN APP — dashboard layout ────────────────────────────────────────────
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [

      // PAGE PUBLIQUE — sans guard
      {
        path: '',
        loadComponent: () =>
          import('./features/biens/biens.component').then(m => m.BiensComponent)
      },

      // PAGES PUBLIQUES SIGNATURE (sans guard — lien email)
      {
        path: 'contrats/signer/:token',
        loadComponent: () =>
          import('./features/contrats/pages/signer/contrat-signer.component').then(
            m => m.ContratSignerComponent
          )
      },
      {
        path: 'edl/signer/:token',
        loadComponent: () =>
          import('./features/etats-des-lieux/pages/signer/edl-signer.component').then(
            m => m.EdlSignerComponent
          )
      },
      {
        path: 'etats-des-lieux/signer/:token',
        loadComponent: () =>
          import('./features/etats-des-lieux/pages/signer/edl-signer.component').then(
            m => m.EdlSignerComponent
          )
      },

      // PROPRIÉTAIRE
      {
        path: 'pro',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/biens/biens.component').then(m => m.BiensComponent)
          },
          {
            path: 'biens',
            loadComponent: () =>
              import('./features/biens/biens.component').then(m => m.BiensComponent)
          },
          {
            path: 'biens/nouveau',
            loadComponent: () =>
              import('./features/biens/pages/bien-create/bien-create.component').then(
                m => m.BienCreateComponent
              )
          },
          {
            path: 'biens/:id/modifier',
            loadComponent: () =>
              import('./features/biens/pages/bien-edit/bien-edit.component').then(
                m => m.BienEditComponent
              )
          },
          {
            path: 'biens/:id/assigner',
            loadComponent: () =>
              import('./features/biens/pages/assign-tenant/assign-tenant.component').then(
                m => m.AssignTenantComponent
              )
          },
          {
            path: 'biens/:id',
            loadComponent: () =>
              import('./features/biens/pages/bien-detail/bien-detail.component').then(
                m => m.BienDetailComponent
              )
          },
          {
            path: 'logements/:bienId',
            loadChildren: () =>
              import('./features/gestion-logement/gestion-logement.routes').then(
                m => m.GESTION_LOGEMENT_ROUTES
              )
          },
          {
            path: 'contrats',
            loadComponent: () =>
              import('./features/contrats/contrats.component').then(m => m.ContratsComponent)
          },
          {
            path: 'etats-des-lieux',
            loadComponent: () =>
              import('./features/etats-des-lieux/etats-des-lieux.component').then(
                m => m.EtatsDesLieuxComponent
              )
          },
          {
            path: 'quittances',
            loadComponent: () =>
              import('./features/quittances/quittances.component').then(m => m.QuittancesComponent)
          },
          {
            path: 'messagerie',
            loadComponent: () =>
              import('./features/messagerie/pages/chat-layout/chat-layout.component').then(
                m => m.ChatLayoutComponent
              )
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
            loadComponent: () =>
              import('./features/biens/biens.component').then(m => m.BiensComponent)
          },
          {
            path: 'mon-logement',
            loadComponent: () =>
              import('./features/tenant/mon-logement/mon-logement.component').then(
                m => m.MonLogementComponent
              )
          },
          {
            path: 'logements/:bienId',
            loadChildren: () =>
              import('./features/gestion-logement/gestion-logement.routes').then(
                m => m.GESTION_LOGEMENT_ROUTES
              )
          },
          {
            path: 'contrats',
            loadComponent: () =>
              import('./features/contrats/contrats.component').then(m => m.ContratsComponent)
          },
          {
            path: 'etats-des-lieux',
            loadComponent: () =>
              import('./features/etats-des-lieux/etats-des-lieux.component').then(
                m => m.EtatsDesLieuxComponent
              )
          },
          {
            path: 'quittances',
            loadComponent: () =>
              import('./features/quittances/quittances.component').then(m => m.QuittancesComponent)
          },
          {
            path: 'documents',
            loadComponent: () =>
              import('./features/tenant/documents/loc-documents.component').then(
                m => m.LocDocumentsComponent
              )
          },
          {
            path: 'messagerie',
            loadComponent: () =>
              import('./features/messagerie/pages/chat-layout/chat-layout.component').then(
                m => m.ChatLayoutComponent
              )
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
            loadComponent: () =>
              import('./features/account/private/profile-home/profile-home.component').then(
                m => m.ProfileHomeComponent
              )
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./features/account/private/account-settings/account-settings.component').then(
                m => m.AccountSettingsComponent
              )
          }
        ]
      },

      // DÉTAIL BIEN partagé
      {
        path: 'biens/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/biens/pages/bien-detail/bien-detail.component').then(
            m => m.BienDetailComponent
          )
      },

      { path: '**', redirectTo: '' }
    ]
  }
];
