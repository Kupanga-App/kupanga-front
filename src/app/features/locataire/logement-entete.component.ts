import { Component, computed, input } from '@angular/core';
import { BienDTO, adresseLisible } from '../biens/models/bien.model';
import { OngletPage, OngletsComponent } from '../../shared/ui/segmented.component';
import { nomCourt } from './nom-court';

/**
 * En-tête de Mon logement et des quittances du locataire (maquettes `Mon-Logement*`) : titre du logement, adresse,
 * « propriétaire : Claire M. », puis les onglets Logement · Documents · Quittances · Messages (adresses existantes ;
 * Documents et Messages sont les pages communes, sans cet en-tête).
 */
@Component({
  selector: 'kp-logement-entete',
  standalone: true,
  imports: [OngletsComponent],
  template: `
    <header class="entete">
      @if (bien(); as b) {
        <h1 [title]="b.titre">{{ b.titre }}</h1>
        <p class="meta">{{ adresse() }}@if (proprietaire()) { · propriétaire : {{ proprietaire() }}}</p>
      } @else if (chargement()) {
        <span class="kp-skeleton kp-skeleton--titre" aria-busy="true"></span>
      } @else {
        <h1>{{ titreDefaut() }}</h1>
      }
      <kp-onglets libelle="Mon logement" [onglets]="onglets()" />
    </header>
  `,
  styles: [`
    :host { display: block; }
    .entete { display: flex; flex-direction: column; gap: 6px; padding: var(--kp-space-4) 0; }
    h1 { font-size: var(--kp-fs-page-title); font-weight: 500; overflow-wrap: anywhere; }
    .meta { color: var(--kp-text-muted); font-size: 14px; }
    kp-onglets { margin-top: var(--kp-space-3); }
    @media (min-width: 768px) {
      .entete { padding-top: var(--kp-space-6); }
    }
  `],
})
export class LogementEnteteComponent {
  readonly bien = input<BienDTO | null>(null);
  readonly chargement = input(false);
  /** Titre sans logement chargé (hors ligne, aucun logement). */
  readonly titreDefaut = input('Mon logement');

  readonly adresse = computed(() => {
    const b = this.bien();
    return b ? adresseLisible(b) : '';
  });
  readonly proprietaire = computed(() => {
    const p = this.bien()?.proprietaire;
    return p ? nomCourt(p.firstName, p.lastName) : '';
  });

  readonly onglets = computed<OngletPage[]>(() => {
    const b = this.bien();
    // Même conversation que le bouton « Message » de la carte du propriétaire
    const message = b ? { bienId: b.id, interlocuteur: b.proprietaire?.mail ?? null } : null;
    return [
      { libelle: 'Logement', lien: '/mon-logement' },
      { libelle: 'Documents', lien: '/documents' },
      { libelle: 'Quittances', lien: '/quittances' },
      { libelle: 'Messages', lien: '/messages', queryParams: message },
    ];
  });
}
