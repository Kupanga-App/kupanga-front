import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GestionLogementService } from '../../services/gestion-logement.service';
import { ModeChauffage } from '../../../biens/models/bien.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'kp-resume-logement',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './resume-logement.component.html',
  styleUrls: ['./resume-logement.component.scss'],
})
export class ResumeLogementComponent {
  private gestion = inject(GestionLogementService);

  readonly bien = this.gestion.bien;
  readonly contratStatut = this.gestion.contratStatut;
  readonly locataire = computed(() => this.bien()?.locataire ?? null);
  readonly proprietaire = computed(() => this.bien()?.proprietaire ?? null);

  readonly loyerAnnuel = computed(() => (this.bien()?.loyerMensuel ?? 0) * 12);
  readonly hasContratActif = computed(() => this.contratStatut() === 'SIGNE');
  readonly bienId = computed(() => this.bien()?.id);

  openContratNew(): void {
    this.gestion.activeView.set('contrat-new');
    this.gestion.selectedTabIndex.set(1);
  }

  chauffageLabel(mode: ModeChauffage): string {
    const map: Record<ModeChauffage, string> = {
      ELECTRIQUE: 'Électrique',
      GAZ: 'Gaz',
      FIOUL: 'Fioul',
      BOIS: 'Bois',
      POMPE_A_CHALEUR: 'Pompe à chaleur',
      POELE: 'Poêle',
      COLLECTIF: 'Collectif',
      SANS_CHAUFFAGE: 'Sans chauffage',
    };
    return map[mode] ?? mode;
  }
}
