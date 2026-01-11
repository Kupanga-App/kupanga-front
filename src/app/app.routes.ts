import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // Public routes will go here
    ]
  },
  {
    path: 'admin',
    component: DashboardLayoutComponent,
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
