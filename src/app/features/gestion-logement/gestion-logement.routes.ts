import { Routes } from '@angular/router';

export const GESTION_LOGEMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./gestion-logement-shell.component').then(
        (m) => m.GestionLogementShellComponent
      ),
  },
];
