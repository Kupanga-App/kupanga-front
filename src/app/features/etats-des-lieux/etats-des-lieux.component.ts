import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { EdlService } from '../gestion-logement/services/edl.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { EtatDesLieuxDTO, EdlStatut, EdlType } from '../gestion-logement/models/edl.model';

@Component({
  selector: 'kp-etats-des-lieux',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    IconComponent,
  ],
  templateUrl: './etats-des-lieux.component.html',
  styleUrls: ['./etats-des-lieux.component.scss'],
})
export class EtatsDesLieuxComponent implements OnInit {
  private edlService = inject(EdlService);
  private authService = inject(AuthService);

  readonly isProprietaire = computed(
    () => this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE'
  );

  readonly edls = signal<EtatDesLieuxDTO[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.edlService.search({}).subscribe({
      next: (page) => { this.edls.set(page.contenu); this.loading.set(false); },
      error: () => { this.error.set('Impossible de charger les états des lieux.'); this.loading.set(false); },
    });
  }

  typeLabel(t: EdlType): string {
    return t === 'ENTREE' ? 'Entrée' : 'Sortie';
  }

  typeClass(t: EdlType): string {
    return t === 'ENTREE' ? 'kp-edl-entree' : 'kp-edl-sortie';
  }

  statutLabel(s: EdlStatut): string {
    const map: Record<EdlStatut, string> = {
      BROUILLON: 'Brouillon',
      EN_ATTENTE_SIGNATURE_PROPRIO: 'Attente proprio',
      EN_ATTENTE_SIGNATURE_LOCATAIRE: 'Attente locataire',
      SIGNE: 'Signé',
      EXPIRE: 'Expiré',
    };
    return map[s] ?? s;
  }

  statutClass(s: EdlStatut): string {
    switch (s) {
      case 'SIGNE': return 'kp-badge-success';
      case 'EN_ATTENTE_SIGNATURE_PROPRIO':
      case 'EN_ATTENTE_SIGNATURE_LOCATAIRE': return 'kp-badge-pending';
      case 'EXPIRE': return 'kp-badge-danger';
      default: return 'kp-badge-inactive';
    }
  }
}
