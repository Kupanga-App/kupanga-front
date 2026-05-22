import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { PrincipalNavHeaderComponent } from '../../shared/components/principal-nav-header/principal-nav-header.component';
import { ChatNotificationComponent } from '../../features/messagerie/components/chat-notification/chat-notification.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PrincipalNavHeaderComponent,
    ChatNotificationComponent,
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss'],
})
export class DashboardLayoutComponent {
  private router = inject(Router);

  showNav = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => !this.router.url.startsWith('/auth')),
      startWith(!this.router.url.startsWith('/auth')),
    ),
    { initialValue: !this.router.url.startsWith('/auth') }
  );

  isMessagerie = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url.includes('/messagerie')),
      startWith(this.router.url.includes('/messagerie')),
    ),
    { initialValue: this.router.url.includes('/messagerie') }
  );
}
