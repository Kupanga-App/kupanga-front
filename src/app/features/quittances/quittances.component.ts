import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { QuittanceService } from '../gestion-logement/services/quittance.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { QuittanceDTO, QuittanceStatut } from '../gestion-logement/models/quittance.model';

@Component({
  selector: 'kp-quittances',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    IconComponent,
  ],
  templateUrl: './quittances.component.html',
  styleUrls: ['./quittances.component.scss'],
})
export class QuittancesComponent implements OnInit {
  private quittanceService = inject(QuittanceService);
  private authService = inject(AuthService);

  readonly isProprietaire = computed(
    () => this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE'
  );

  readonly quittances = signal<QuittanceDTO[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.quittanceService.search({}).subscribe({
      next: (page) => { this.quittances.set(page.contenu); this.loading.set(false); },
      error: () => { this.error.set('Impossible de charger les quittances.'); this.loading.set(false); },
    });
  }

  statutLabel(s: QuittanceStatut): string {
    const map: Record<QuittanceStatut, string> = {
      EN_ATTENTE: 'En attente',
      PAYEE: 'Payée',
      EN_RETARD: 'En retard',
      IMPAYEE: 'Impayée',
    };
    return map[s] ?? s;
  }

  statutClass(s: QuittanceStatut): string {
    switch (s) {
      case 'PAYEE': return 'kp-badge-success';
      case 'EN_ATTENTE': return 'kp-badge-pending';
      case 'EN_RETARD':
      case 'IMPAYEE': return 'kp-badge-danger';
      default: return 'kp-badge-inactive';
    }
  }
}
