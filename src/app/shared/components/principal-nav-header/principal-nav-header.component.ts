import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LogementContextService } from '../../../core/services/logement-context.service';
import { ChatStoreService } from '../../../features/messagerie/services/chat-store.service';

@Component({
  selector: 'app-principal-nav-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
  ],
  templateUrl: './principal-nav-header.component.html',
  styleUrls: ['./principal-nav-header.component.scss'],
})
export class PrincipalNavHeaderComponent implements OnInit {
  protected themeService = inject(ThemeService);
  protected authService = inject(AuthService);
  protected logementContext = inject(LogementContextService);
  protected chatStore = inject(ChatStoreService);

  readonly notificationCount = 0;

  isConnected = computed(() => !!this.authService.currentUser());

  userInitials = computed(() => {
    const u = this.authService.currentUser();
    if (!u) return '';
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase();
  });

  isAdmin = computed(() => this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE');

  hasLogement = computed(() => !!this.logementContext.logementBienId());

  /** Route vers l'espace locatif selon le rôle */
  logementRoute = computed(() => {
    const bienId = this.logementContext.logementBienId();
    if (!bienId) return null;
    return this.isAdmin() ? `/pro/logements/${bienId}` : `/loc/logements/${bienId}`;
  });

  ngOnInit(): void {
    const role = this.authService.currentUser()?.role;
    if (role) {
      this.logementContext.load(role);
    }
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
