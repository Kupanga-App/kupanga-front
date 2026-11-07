import { Component, computed, inject, input, model, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BienDTO, adresseLisible } from '../../biens/models/bien.model';
import { MontantPipe } from '../../../core/money/montant';
import { OngletPage, OngletsComponent, OptionSegment, SegmentedComponent } from '../../../shared/ui/segmented.component';
import { SheetComponent } from '../../../shared/ui/sheet.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Onglet local de la fiche d'un bien vacant (l'annonce n'a pas d'adresse à elle). */
export type OngletVacant = 'apercu' | 'annonce';

/**
 * En-tête des pages d'un bien (`Fiche-Bien-Loue`, `Fiche-Bien-Vacant`) : fil « ‹ Mes biens », titre, état, loyer,
 * adresse ; « Voir l'annonce », « Modifier le bien » et le menu « … » (actions existantes seulement) ; onglets.
 * Bien loué ou réservé : onglets en liens vers les adresses existantes (vue d'ensemble, bail, états des lieux,
 * quittances). Bien vacant, à la racine de la fiche : Vue d'ensemble · Annonce, onglet local (pas d'adresse).
 */
@Component({
  selector: 'kp-fiche-entete',
  standalone: true,
  imports: [RouterLink, MontantPipe, OngletsComponent, SegmentedComponent, SheetComponent, IconComponent],
  template: `
    <header class="entete">
      <a class="fil" routerLink="/biens"><kp-icon name="chevron-left" [size]="16" /> Mes biens</a>
      @if (bien(); as b) {
        <div class="ligne">
          <div class="texte">
            <h1 [title]="b.titre">{{ b.titre }}</h1>
            <p class="meta">
              <span [class]="'kp-statut kp-statut--point kp-statut--' + etat().ton">{{ etat().libelle }}</span>
              @if (b.loyerMensuel != null) {
                <span class="kp-tabulaire">
                  {{ b.loyerMensuel | montant: b.devise : 0 }}@if (b.chargesMensuelles) { + {{ b.chargesMensuelles | montant: b.devise : 0 }} de charges } @else { par mois }
                </span>
              }
              <span class="adresse">{{ adresse() }}</span>
            </p>
          </div>
          <div class="actions">
            @if (!b.archive) {
              <a class="kp-btn kp-btn--ghost kp-btn--sm large" [routerLink]="['/annonces', b.id]">Voir l’annonce</a>
              <a class="kp-btn kp-btn--secondary kp-btn--sm large" [routerLink]="['/biens', b.id, 'modifier']">
                <kp-icon name="pencil" [size]="16" /> Modifier le bien
              </a>
            }
            <button type="button" class="kp-icon-btn plus" (click)="menuOuvert.set(true)" aria-label="Autres actions sur le bien">
              <kp-icon name="ellipsis" />
            </button>
          </div>
        </div>

        @if (ongletsLocaux()) {
          <kp-segmented libelle="Sections du bien" [options]="optionsVacant" [(valeur)]="ongletVacant" />
        } @else {
          <kp-onglets libelle="Sections du bien" [onglets]="onglets()" />
        }
      } @else {
        <span class="kp-skeleton kp-skeleton--titre" aria-busy="true"></span>
      }
    </header>

    @if (bien(); as b) {
      <kp-sheet [(ouvert)]="menuOuvert" titre="Actions">
        <div class="kp-list">
          @if (!b.archive) {
            <button type="button" class="kp-list__item petit-ecran" (click)="aller(['/biens', b.id, 'modifier'])">
              <span class="kp-list__icon"><kp-icon name="pencil" /></span>
              <span class="kp-list__body"><span class="kp-list__title">Modifier le bien</span></span>
            </button>
            <button type="button" class="kp-list__item petit-ecran" (click)="aller(['/annonces', b.id])">
              <span class="kp-list__icon"><kp-icon name="eye" /></span>
              <span class="kp-list__body">
                <span class="kp-list__title">Voir l’annonce</span>
                <span class="kp-list__sub">Telle que la voient les visiteurs</span>
              </span>
            </button>
            @if (!b.locataire) {
              <button type="button" class="kp-list__item" (click)="aller(['/biens', b.id, 'locataire'])">
                <span class="kp-list__icon"><kp-icon name="user-plus" /></span>
                <span class="kp-list__body"><span class="kp-list__title">{{ b.reservation ? 'Gérer la réservation' : 'Proposer la location' }}</span></span>
              </button>
            }
          }
          <button type="button" class="kp-list__item" (click)="aller(['/biens', b.id, 'quittances', 'nouvelle'])" [disabled]="b.archive || !b.locataire">
            <span class="kp-list__icon"><kp-icon name="receipt" /></span>
            <span class="kp-list__body">
              <span class="kp-list__title">Nouvelle quittance</span>
              @if (!b.locataire) { <span class="kp-list__sub">Il faut d’abord un locataire</span> }
            </span>
          </button>
        </div>
        <p class="kp-aide archivage">L’archivage d’un bien se fait par l’administrateur de Kupanga.</p>
      </kp-sheet>
    }
  `,
  styles: [`
    :host { display: block; }
    .entete { display: flex; flex-direction: column; gap: 12px; padding: var(--kp-space-4) 0 var(--kp-space-4); }
    .fil {
      display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; min-height: 32px;
      color: var(--kp-text-muted); font-size: var(--kp-fs-secondary); text-decoration: none;
    }
    .fil:hover { color: var(--kp-text); text-decoration: underline; }
    .ligne { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 24px; margin-top: -8px; }
    .texte { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: 1 1 360px; }
    h1 { font-size: var(--kp-fs-page-title); font-weight: 500; overflow-wrap: anywhere; }
    .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; color: var(--kp-text-muted); font-size: 14px; }
    .meta .kp-statut--point { font-weight: 500; }
    .actions { display: flex; align-items: center; gap: 8px; }
    .archivage { margin-top: var(--kp-space-4); }
    button.kp-list__item:disabled { opacity: 0.5; cursor: not-allowed; }
    .plus { border: 1px solid var(--kp-border-strong); background: var(--kp-surface); }
    @media (max-width: 767px) {
      .large { display: none; }
      .ligne { flex-wrap: nowrap; align-items: flex-start; }
      .adresse { display: none; }
    }
    @media (min-width: 768px) {
      .entete { padding-top: var(--kp-space-6); }
      .petit-ecran { display: none; }
    }
  `],
})
export class FicheEnteteComponent {
  readonly bien = input<BienDTO | null>(null);
  /** Précision de l'état (« bail à créer ») ; la vue d'ensemble seule la connaît. */
  readonly precision = input<string | null>(null);
  /** Vrai sur `/biens/:id` : un bien vacant y a ses onglets locaux. */
  readonly racine = input(false);
  readonly ongletVacant = model<OngletVacant>('apercu');

  private router = inject(Router);
  readonly menuOuvert = signal(false);

  readonly optionsVacant: OptionSegment<OngletVacant>[] = [
    { valeur: 'apercu', libelle: 'Vue d’ensemble' },
    { valeur: 'annonce', libelle: 'Annonce' },
  ];

  readonly adresse = computed(() => {
    const b = this.bien();
    return b ? adresseLisible(b) : '';
  });

  readonly etat = computed<{ libelle: string; ton: 'ok' | 'attention' | 'neutre' }>(() => {
    const b = this.bien();
    const precision = this.precision();
    const avec = (libelle: string) => (precision ? `${libelle} · ${precision}` : libelle);
    if (!b) return { libelle: '', ton: 'neutre' };
    if (b.archive) return { libelle: 'Archivé', ton: 'neutre' };
    if (b.locataire) return { libelle: avec('Loué'), ton: precision ? 'attention' : 'ok' };
    if (b.reservation) return { libelle: avec('Réservé'), ton: 'attention' };
    return { libelle: 'Vacant · annonce en ligne', ton: 'attention' };
  });

  /** Bien sans locataire ni réservation, à la racine de la fiche. */
  readonly ongletsLocaux = computed(() => {
    const b = this.bien();
    return this.racine() && !!b && !b.locataire && !b.reservation && !b.archive;
  });

  readonly onglets = computed<OngletPage[]>(() => {
    const id = this.bien()?.id;
    return [
      { libelle: 'Vue d’ensemble', lien: ['/biens', id], exact: true },
      { libelle: 'Bail', lien: ['/biens', id, 'bail'], exact: true },
      { libelle: 'États des lieux', lien: ['/biens', id, 'etats-des-lieux'], exact: true },
      { libelle: 'Quittances', lien: ['/biens', id, 'quittances'], exact: true },
    ];
  });

  aller(chemin: unknown[]): void {
    this.menuOuvert.set(false);
    void this.router.navigate(chemin);
  }
}
