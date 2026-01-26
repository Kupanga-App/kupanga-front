import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { ToolbarModule } from 'primeng/toolbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { selectUser, selectUserType } from '../../../core/auth/auth.reducer';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-principal-nav-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    AvatarModule,
    BadgeModule,
    MenuModule,
    MenubarModule,
    ToolbarModule,
    IconFieldModule,
    InputIconModule
  ],
  templateUrl: './principal-nav-header.component.html',
  styleUrls: ['./principal-nav-header.component.scss'],
})
export class PrincipalNavHeaderComponent implements OnInit {
  @Input() navItems: MenuItem[] = [];

  private store = inject(Store);
  public themeService = inject(ThemeService);

  userType$: Observable<'owner' | 'tenant' | null>;
  user$: Observable<any>;

  userMenuItems: MenuItem[] = [];

  constructor() {
    this.userType$ = this.store.select(selectUserType);
    this.user$ = this.store.select(selectUser);
  }

  ngOnInit(): void {
    this.userMenuItems = [
      { label: 'Mon Profil', icon: 'pi pi-fw pi-user' },
      { label: 'Paramètres', icon: 'pi pi-fw pi-cog' },
      { separator: true },
      { label: 'Déconnexion', icon: 'pi pi-fw pi-sign-out' },
    ];
  }
}
