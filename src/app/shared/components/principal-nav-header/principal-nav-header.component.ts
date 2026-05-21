import { Component, computed, inject, signal, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import {
  LucideAngularModule,
  Compass, Home, FileText, CheckSquare, CreditCard, Folder,
  MessageSquare, Search, HelpCircle, Lightbulb,
  Bell, Sun, Moon, Menu, X,
  User, Settings, LogOut, ChevronDown,
} from 'lucide-angular';
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
    MatMenuModule,
    MatDividerModule,
    LucideAngularModule,
  ],
  templateUrl: './principal-nav-header.component.html',
  styleUrls: ['./principal-nav-header.component.scss'],
})
export class PrincipalNavHeaderComponent implements OnInit, OnDestroy {
  protected themeService = inject(ThemeService);
  protected authService = inject(AuthService);
  protected logementContext = inject(LogementContextService);
  protected chatStore = inject(ChatStoreService);

  // Icônes Lucide
  readonly Compass = Compass;
  readonly Home = Home;
  readonly FileText = FileText;
  readonly CheckSquare = CheckSquare;
  readonly CreditCard = CreditCard;
  readonly Folder = Folder;
  readonly MessageSquare = MessageSquare;
  readonly Search = Search;
  readonly HelpCircle = HelpCircle;
  readonly Lightbulb = Lightbulb;
  readonly Bell = Bell;
  readonly Sun = Sun;
  readonly Moon = Moon;
  readonly Menu = Menu;
  readonly X = X;
  readonly User = User;
  readonly Settings = Settings;
  readonly LogOut = LogOut;
  readonly ChevronDown = ChevronDown;

  readonly notificationCount = 0;

  drawerOpen = signal(false);

  isConnected = computed(() => !!this.authService.currentUser());

  userInitials = computed(() => {
    const u = this.authService.currentUser();
    if (!u) return '';
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase();
  });

  userName = computed(() => {
    const u = this.authService.currentUser();
    if (!u) return '';
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  });

  userEmail = computed(() => this.authService.currentUser()?.email ?? '');

  isAdmin = computed(() => this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE');

  hasLogement = computed(() => !!this.logementContext.logementBienId());

  userPhoto = computed(() => this.authService.currentUser()?.urlProfile ?? null);

  ngOnInit(): void {
    const role = this.authService.currentUser()?.role;
    if (role) {
      this.logementContext.load(role);
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  toggleDrawer(): void {
    const next = !this.drawerOpen();
    this.drawerOpen.set(next);
    document.body.style.overflow = next ? 'hidden' : '';
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen()) this.closeDrawer();
  }

  logout(): void {
    this.closeDrawer();
    this.authService.logout().subscribe();
  }
}
