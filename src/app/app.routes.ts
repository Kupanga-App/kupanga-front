import { Routes } from '@angular/router';
import { AppShellComponent } from './layouts/app-shell/app-shell.component';
import { accueilGuard, authGuard, invitesGuard, roleGuard } from './core/auth/guards/auth.guard';

const PROPRIETAIRE = [authGuard, roleGuard('ROLE_PROPRIETAIRE')];
const LOCATAIRE = [authGuard, roleGuard('ROLE_LOCATAIRE')];

/**
 * Une route par écran (AUDIT.md §6.2) ; le rôle est vérifié par des gardes, jamais déduit de l'URL.
 * Adresses utilisées dans les e-mails de l'API, à ne pas changer : /auth/login, /auth/forgot,
 * /auth/reset-password, /auth/verifier-email, /contrats/signer/:token, /edl/signer/:token.
 */
export const routes: Routes = [
  {
    path: 'auth',
    children: [
      { path: 'login', canActivate: [invitesGuard], title: 'Connexion · Kupanga',
        loadComponent: () => import('./core/auth/pages/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', canActivate: [invitesGuard], title: 'Créer un compte · Kupanga',
        loadComponent: () => import('./core/auth/pages/register/register.component').then(m => m.RegisterComponent) },
      { path: 'forgot', title: 'Mot de passe oublié · Kupanga',
        loadComponent: () => import('./core/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: 'reset-password', title: 'Nouveau mot de passe · Kupanga',
        loadComponent: () => import('./core/auth/pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
      { path: 'verifier-email', title: 'Confirmation de l’e-mail · Kupanga',
        loadComponent: () => import('./core/auth/pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent) },
      { path: 'google-role', title: 'Votre rôle · Kupanga',
        loadComponent: () => import('./core/auth/pages/complete-profile/complete-profile.component').then(m => m.CompleteProfileComponent) },
      { path: 'signup', redirectTo: 'register' },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },

  // Signature depuis le lien reçu par e-mail : publique, plein écran
  { path: 'contrats/signer/:token', title: 'Signer le bail · Kupanga',
    loadComponent: () => import('./features/signature/signer-contrat.component').then(m => m.SignerContratComponent) },
  { path: 'edl/signer/:token', title: 'Signer l’état des lieux · Kupanga',
    loadComponent: () => import('./features/signature/signer-edl.component').then(m => m.SignerEdlComponent) },
  { path: 'etats-des-lieux/signer/:token', redirectTo: 'edl/signer/:token' },

  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', pathMatch: 'full', canActivate: [accueilGuard], children: [] },

      // Annonces publiques (sans compte)
      { path: 'explorer', title: 'Logements à louer · Kupanga',
        loadComponent: () => import('./features/explorer/explorer.component').then(m => m.ExplorerComponent) },
      { path: 'annonces/:id', title: 'Annonce · Kupanga',
        loadComponent: () => import('./features/explorer/annonce.component').then(m => m.AnnonceComponent) },

      // Propriétaire
      { path: 'accueil', canActivate: PROPRIETAIRE, title: 'Accueil · Kupanga',
        loadComponent: () => import('./features/proprietaire/accueil/accueil.component').then(m => m.AccueilComponent) },
      { path: 'biens', canActivate: PROPRIETAIRE, title: 'Mes biens · Kupanga',
        loadComponent: () => import('./features/proprietaire/biens/biens.component').then(m => m.BiensComponent) },
      { path: 'biens/nouveau', canActivate: PROPRIETAIRE, data: { pleinEcran: true }, title: 'Nouveau bien · Kupanga',
        loadComponent: () => import('./features/biens/pages/bien-create/bien-create.component').then(m => m.BienCreateComponent) },
      { path: 'biens/:id', canActivate: PROPRIETAIRE, title: 'Bien · Kupanga',
        loadComponent: () => import('./features/proprietaire/fiche/fiche-bien.component').then(m => m.FicheBienComponent) },
      { path: 'biens/:id/modifier', canActivate: PROPRIETAIRE, title: 'Modifier le bien · Kupanga',
        loadComponent: () => import('./features/biens/pages/bien-edit/bien-edit.component').then(m => m.BienEditComponent) },
      { path: 'biens/:id/locataire', canActivate: PROPRIETAIRE, title: 'Choisir le locataire · Kupanga',
        loadComponent: () => import('./features/biens/pages/assign-tenant/assign-tenant.component').then(m => m.AssignTenantComponent) },
      { path: 'biens/:id/bail', canActivate: PROPRIETAIRE, title: 'Bail · Kupanga',
        loadComponent: () => import('./features/proprietaire/bail/bail.component').then(m => m.BailComponent) },
      { path: 'biens/:id/bail/nouveau', canActivate: PROPRIETAIRE, data: { pleinEcran: true }, title: 'Nouveau bail · Kupanga',
        loadComponent: () => import('./features/proprietaire/bail/nouveau-bail.component').then(m => m.NouveauBailComponent) },
      { path: 'biens/:id/etats-des-lieux', canActivate: PROPRIETAIRE, title: 'États des lieux · Kupanga',
        loadComponent: () => import('./features/proprietaire/edl/etats-des-lieux.component').then(m => m.EtatsDesLieuxComponent) },
      { path: 'biens/:id/etats-des-lieux/nouveau', canActivate: PROPRIETAIRE, data: { pleinEcran: true }, title: 'Nouvel état des lieux · Kupanga',
        loadComponent: () => import('./features/proprietaire/edl/nouvel-edl.component').then(m => m.NouvelEdlComponent) },
      { path: 'biens/:id/quittances', canActivate: PROPRIETAIRE, title: 'Quittances · Kupanga',
        loadComponent: () => import('./features/proprietaire/quittances/quittances-bien.component').then(m => m.QuittancesBienComponent) },
      { path: 'biens/:id/quittances/nouvelle', canActivate: PROPRIETAIRE, data: { pleinEcran: true }, title: 'Nouvelle quittance · Kupanga',
        loadComponent: () => import('./features/proprietaire/quittances/nouvelle-quittance.component').then(m => m.NouvelleQuittanceComponent) },

      // Locataire
      { path: 'mon-logement', canActivate: LOCATAIRE, title: 'Mon logement · Kupanga',
        loadComponent: () => import('./features/locataire/mon-logement.component').then(m => m.MonLogementComponent) },
      { path: 'quittances', canActivate: LOCATAIRE, title: 'Mes quittances · Kupanga',
        loadComponent: () => import('./features/locataire/mes-quittances.component').then(m => m.MesQuittancesComponent) },

      // Commun
      { path: 'documents', canActivate: [authGuard], title: 'Documents · Kupanga',
        loadComponent: () => import('./features/documents/documents.component').then(m => m.DocumentsComponent) },
      { path: 'messages', canActivate: [authGuard], title: 'Messages · Kupanga',
        loadComponent: () => import('./features/messagerie/pages/messages/messages.component').then(m => m.MessagesComponent) },
      { path: 'notifications', canActivate: [authGuard], title: 'Notifications · Kupanga',
        loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'compte', canActivate: [authGuard], title: 'Compte · Kupanga',
        loadComponent: () => import('./features/compte/compte.component').then(m => m.CompteComponent) },

      // Anciennes adresses (favoris, liens déjà envoyés)
      { path: 'pro', pathMatch: 'full', redirectTo: 'accueil' },
      { path: 'pro/biens', pathMatch: 'full', redirectTo: 'biens' },
      { path: 'pro/biens/nouveau', redirectTo: 'biens/nouveau' },
      { path: 'pro/biens/:id', redirectTo: 'biens/:id' },
      { path: 'pro/logements/:id', redirectTo: 'biens/:id' },
      { path: 'pro/messagerie', redirectTo: 'messages' },
      { path: 'pro/contrats', redirectTo: 'documents' },
      { path: 'pro/etats-des-lieux', redirectTo: 'documents' },
      { path: 'pro/quittances', redirectTo: 'documents' },
      { path: 'loc', pathMatch: 'full', redirectTo: '' },
      { path: 'loc/mon-logement', redirectTo: 'mon-logement' },
      { path: 'loc/messagerie', redirectTo: 'messages' },
      { path: 'loc/quittances', redirectTo: 'quittances' },
      { path: 'loc/documents', redirectTo: 'documents' },
      { path: 'loc/contrats', redirectTo: 'documents' },
      { path: 'loc/etats-des-lieux', redirectTo: 'documents' },
      { path: 'biens/:id/assigner', redirectTo: 'biens/:id/locataire' },
      { path: 'account/private/home', redirectTo: 'compte' },
      { path: 'account/settings', redirectTo: 'compte' },

      { path: '**', title: 'Page introuvable · Kupanga',
        loadComponent: () => import('./features/erreur/page-introuvable.component').then(m => m.PageIntrouvableComponent) },
    ],
  },
];
