import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ContratService } from '../gestion-logement/services/contrat.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { ContratDTO, ContratStatut } from '../gestion-logement/models/contrat.model';

@Component({
  selector: 'app-contrats',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    IconComponent,
  ],
  templateUrl: './contrats.component.html',
  styleUrls: ['./contrats.component.scss'],
})
export class ContratsComponent implements OnInit {
  private contratService = inject(ContratService);
  private authService = inject(AuthService);

  readonly isProprietaire = computed(
    () => this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE'
  );

  readonly contrats = signal<ContratDTO[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.contratService.search({}).subscribe({
      next: (page) => { this.contrats.set(page.contenu); this.loading.set(false); },
      error: () => { this.error.set('Impossible de charger les contrats.'); this.loading.set(false); },
    });
  }

  statutLabel(s: ContratStatut): string {
    const map: Record<ContratStatut, string> = {
      BROUILLON: 'Brouillon',
      EN_ATTENTE_SIGNATURE_PROPRIO: 'Attente proprio',
      EN_ATTENTE_SIGNATURE_LOCATAIRE: 'Attente locataire',
      SIGNE: 'Signé',
      EXPIRE: 'Expiré',
      ANNULE: 'Annulé',
    };
    return map[s] ?? s;
  }

  statutClass(s: ContratStatut): string {
    switch (s) {
      case 'SIGNE': return 'kp-badge-success';
      case 'EN_ATTENTE_SIGNATURE_PROPRIO':
      case 'EN_ATTENTE_SIGNATURE_LOCATAIRE': return 'kp-badge-pending';
      case 'EXPIRE':
      case 'ANNULE': return 'kp-badge-danger';
      default: return 'kp-badge-inactive';
    }
  }
}
