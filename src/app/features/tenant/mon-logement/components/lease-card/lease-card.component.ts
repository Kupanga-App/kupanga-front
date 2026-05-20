import { Component, input, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TagPillComponent } from '../../../../../shared/components/tag-pill/tag-pill.component';
import { ContratDetails } from '../../models/tenant.models';

@Component({
  selector: 'kp-lease-card',
  standalone: true,
  imports: [TagPillComponent, DatePipe],
  templateUrl: './lease-card.component.html',
  styleUrl: './lease-card.component.scss',
})
export class LeaseCardComponent {
  contrat = input.required<ContratDetails>();

  progressPct = computed(() => {
    const c = this.contrat();
    return Math.min(100, Math.round((c.moisEcoules / c.dureeTotale) * 100));
  });

  statutVariante = computed((): 'olive' | 'red' | 'mint' => {
    switch (this.contrat().statut) {
      case 'terminated': return 'red';
      case 'draft': return 'mint';
      default: return 'olive';
    }
  });

  statutLibelle = computed(() => {
    switch (this.contrat().statut) {
      case 'terminated': return 'BAIL EXPIRÉ';
      case 'draft': return 'BROUILLON';
      default: return 'BAIL ACTIF';
    }
  });

  typeLibelle = computed(() => {
    switch (this.contrat().type) {
      case 'meuble': return 'Meublé';
      case 'coloc': return 'Colocation';
      default: return 'Non meublé';
    }
  });
}
