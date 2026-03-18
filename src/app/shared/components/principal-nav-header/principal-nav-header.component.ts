import { Component, computed, inject } from '@angular/core';
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
export class PrincipalNavHeaderComponent {
  protected themeService = inject(ThemeService);
  protected authService = inject(AuthService);

  readonly notificationCount = 0;

  isConnected = computed(() => !!this.authService.currentUser());

  userInitials = computed(() => {
    const u = this.authService.currentUser();
    if (!u) return '';
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase();
  });

  isAdmin = computed(() => this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE');

  logout(): void {
    this.authService.logout().subscribe();
  }
}
