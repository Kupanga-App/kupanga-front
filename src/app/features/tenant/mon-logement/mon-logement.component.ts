import { Component, inject, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { TagPillComponent } from '../../../shared/components/tag-pill/tag-pill.component';
import { HomeHeroComponent } from './components/home-hero/home-hero.component';
import { HealthCheckComponent } from './components/health-check/health-check.component';
import { KpiStripComponent } from './components/kpi-strip/kpi-strip.component';
import { NextRentComponent } from './components/next-rent/next-rent.component';
import { ReceiptListComponent } from './components/receipt-list/receipt-list.component';
import { OwnerCardComponent } from './components/owner-card/owner-card.component';
import { QuickActionsComponent } from './components/quick-actions/quick-actions.component';
import { LeaseCardComponent } from './components/lease-card/lease-card.component';
import { MeterCardComponent } from './components/meter-card/meter-card.component';
import { TenantHomeService } from './services/tenant-home.service';
import { LogementContextService } from '../../../core/services/logement-context.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { QuickAction } from './models/tenant.models';

@Component({
  selector: 'kp-mon-logement',
  standalone: true,
  imports: [
    IconComponent,
    TagPillComponent,
    DatePipe,
    HomeHeroComponent,
    HealthCheckComponent,
    KpiStripComponent,
    NextRentComponent,
    ReceiptListComponent,
    OwnerCardComponent,
    QuickActionsComponent,
    LeaseCardComponent,
    MeterCardComponent,
  ],
  templateUrl: './mon-logement.component.html',
  styleUrl: './mon-logement.component.scss',
})
export class MonLogementComponent {
  protected readonly svc = inject(TenantHomeService);
  private readonly logementCtx = inject(LogementContextService);
  private readonly authSvc = inject(AuthService);
  private readonly router = inject(Router);

  private lastLoadedBienId: number | null = null;

  constructor() {
    // Déclenche la résolution du bienId si ce n'est pas encore fait
    const role = this.authSvc.currentUser()?.role;
    if (role && !this.logementCtx.hasLogement()) {
      this.logementCtx.load(role);
    }

    // Lecture synchrone : si le bienId est déjà connu (localStorage cache),
    // on appelle loadDashboard immédiatement sans attendre le premier cycle CD.
    const immediateId = this.logementCtx.logementBienId();
    if (immediateId !== null) {
      this.lastLoadedBienId = immediateId;
      this.svc.loadDashboard(immediateId);
    }

    // Fallback réactif : déclenche le chargement quand le bienId arrive (pas de cache)
    effect(() => {
      const bienId = this.logementCtx.logementBienId();
      if (bienId !== null && bienId !== this.lastLoadedBienId) {
        this.lastLoadedBienId = bienId;
        this.svc.loadDashboard(bienId);
      }
    });
  }

  onAction(action: QuickAction): void {
    if (action.route) {
      this.router.navigateByUrl(action.route);
    }
  }

  onPayerMaintenant(): void {
    this.router.navigateByUrl('/loc/paiement');
  }

  onEnvoyerMessage(): void {
    this.router.navigateByUrl('/loc/messagerie');
  }
}
