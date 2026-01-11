import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { PrincipalNavHeaderComponent } from '../../shared/components/principal-nav-header/principal-nav-header.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PrincipalNavHeaderComponent
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss'],
})
export class DashboardLayoutComponent implements OnInit {
  navItems: MenuItem[] = [];
  mobileNavItems: MenuItem[] = [];

  ngOnInit(): void {
    this.navItems = [
      // user
      { label: 'Accueil', routerLink: 'home' },
      { label: 'Mes Biens', routerLink: 'biens' },
      { label: 'Mes Contrats', routerLink: 'contrats' },
      { label: 'États des Lieux', routerLink: 'etats-des-lieux' },
      { label: 'Quittances', routerLink: 'quittances' },
      // Catégories
      { label: 'Immobilier', routerLink: 'immobilier' },
      { label: 'Véhicules', routerLink: 'vehicules' },
      { label: 'Vacances', routerLink: 'vacances' },
      { label: 'Maison & Jardin', routerLink: 'maison-jardin' },
      { label: 'Famille', routerLink: 'famille' },
      { label: 'Autres', routerLink: 'autres' },
      { label: 'Bons plans !', routerLink: 'bons-plans' },
    ];

    this.mobileNavItems = [
        { label: 'Mes Biens', routerLink: 'biens' },
        { label: 'Mes Contrats', routerLink: 'contrats' },
        { label: 'États des Lieux', routerLink: 'etats-des-lieux' },
        { label: 'Quittances', routerLink: 'quittances' },
    ];
  }
}
