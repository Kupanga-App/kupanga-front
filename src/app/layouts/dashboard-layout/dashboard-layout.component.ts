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

  ngOnInit(): void {
    this.navItems = [
      // user
      { label: 'Accueil', routerLink: 'home', icon: 'pi pi-home' },
      { label: 'Mes Biens', routerLink: 'biens', icon: 'pi pi-building' },
      { label: 'Mes Contrats', routerLink: 'contrats', icon: 'pi pi-file' },
      { label: 'États des Lieux', routerLink: 'etats-des-lieux', icon: 'pi pi-check-square' },
      { label: 'Quittances', routerLink: 'quittances', icon: 'pi pi-receipt' },
      // Catégories
      { label: 'Immobilier', routerLink: 'immobilier' },
      { label: 'Autres', routerLink: 'autres' },
      { label: 'Bons plans !', routerLink: 'bons-plans', icon: 'pi pi-tag' },
    ];
  }
}
