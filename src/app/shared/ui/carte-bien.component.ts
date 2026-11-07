import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BienDTO, LIBELLES_EQUIPEMENT, libelleTypeBien, vignette } from '../../features/biens/models/bien.model';
import { MontantPipe } from '../../core/money/montant';
import { IconComponent } from '../components/icon/icon.component';
import { ClasseEnergieComponent } from './classe-energie.component';

/**
 * Carte d'un bien (annonces, biens du propriétaire) : photo, loyer, titre, lieu, caractéristiques.
 * `disposition="ligne"` : photo à gauche, comme la liste d'Explorer à côté de la carte (`O1v2-Explorer`) ;
 * `selectionne` cercle la carte d'olive.
 */
@Component({
  selector: 'kp-carte-bien',
  standalone: true,
  imports: [RouterLink, MontantPipe, IconComponent, ClasseEnergieComponent],
  host: { '[class.ligne]': "disposition() === 'ligne'", '[class.selectionne]': 'selectionne()' },
  template: `
    <a class="carte" [routerLink]="lien()" [queryParams]="queryParams()" [attr.title]="bien().titre">
      <div class="photo">
        @if (photo(); as p) {
          <img [src]="p" alt="" loading="lazy" decoding="async" />
        } @else {
          <span class="sans-photo"><kp-icon name="image" [size]="28" [strokeWidth]="1.5" /></span>
        }
        <span class="statut"><ng-content select="[statut]" /></span>
      </div>
      <div class="infos">
        @if (bien().loyerMensuel != null) {
          <p class="prix"><span class="kp-montant">{{ bien().loyerMensuel | montant: bien().devise : 0 }}</span> <span class="par-mois">par mois</span></p>
        }
        <p class="titre">{{ bien().titre }}</p>
        @if (disposition() === 'ligne') {
          @if (caracteristiques()) {
            <p class="meta">{{ caracteristiques() }}</p>
          }
          <p class="lieu kp-ellipsis"><kp-icon name="map-pin" [size]="14" [strokeWidth]="1.5" /> {{ lieu() }}</p>
          @if (bien().classeEnergie || atout()) {
            <p class="atouts">
              @if (bien().classeEnergie; as c) {
                <kp-classe-energie [classe]="c" forme="pastille" nom="DPE" /> DPE
              }
              @if (bien().classeEnergie && atout()) {
                <span class="sep" aria-hidden="true">·</span>
              }
              {{ atout() }}
            </p>
          }
        } @else {
          <p class="lieu kp-ellipsis"><kp-icon name="map-pin" [size]="14" [strokeWidth]="1.5" /> {{ lieu() }}</p>
          @if (caracteristiques()) {
            <p class="meta">{{ caracteristiques() }}</p>
          }
        }
        <ng-content />
      </div>
    </a>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .carte {
      display: flex; flex-direction: column; height: 100%; overflow: hidden;
      border-radius: var(--kp-radius-lg); background: var(--kp-surface); box-shadow: var(--kp-elev-0);
      color: var(--kp-text); text-decoration: none;
      transition: box-shadow var(--kp-duree) var(--kp-ease);
    }
    .carte:hover { box-shadow: 0 0 0 1px var(--kp-border-strong); }
    :host(.selectionne) .carte, :host(.selectionne) .carte:hover { box-shadow: 0 0 0 1px var(--kp-accent); }
    .photo { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: var(--kp-surface-sunken); }
    .photo img { width: 100%; height: 100%; object-fit: cover; }
    .sans-photo { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--kp-text-subtle); }
    .statut { position: absolute; top: 8px; left: 8px; }
    .statut:empty { display: none; }
    .infos { display: flex; flex-direction: column; gap: 2px; padding: var(--kp-space-3) var(--kp-space-4) var(--kp-space-4); min-width: 0; }
    .prix { font-size: var(--kp-fs-subtitle); font-weight: 500; }
    .par-mois { margin-left: 4px; font-size: 14px; font-weight: 400; color: var(--kp-text-subtle); }
    .titre { font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .lieu { display: flex; align-items: center; gap: 4px; color: var(--kp-text-subtle); font-size: var(--kp-fs-secondary); }
    .meta { font-size: 14px; color: var(--kp-text-muted); }

    /* Ligne : photo 200 × 136 à gauche (O1v2-Explorer) */
    :host(.ligne) .carte { flex-direction: row; gap: var(--kp-space-4); padding: var(--kp-space-2); }
    :host(.ligne) .carte { align-items: flex-start; }
    :host(.ligne) .photo { flex: none; width: 200px; height: 136px; aspect-ratio: auto; border-radius: var(--kp-radius-md); overflow: hidden; }
    :host(.ligne) .infos { flex: 1; align-self: stretch; padding: var(--kp-space-2) var(--kp-space-2) var(--kp-space-2) 0; gap: var(--kp-space-1); }
    :host(.ligne) .prix { font-size: 22px; }
    :host(.ligne) .titre { display: block; white-space: nowrap; text-overflow: ellipsis; }
    .atouts { margin-top: auto; display: flex; align-items: center; gap: var(--kp-space-2); font-size: var(--kp-fs-secondary); color: var(--kp-text-muted); }
    .sep { color: var(--kp-border-strong); }
    @media (max-width: 767px) {
      :host(.ligne) .photo { width: 112px; height: 112px; }
      :host(.ligne) .prix { font-size: var(--kp-fs-card-title); }
    }
  `],
})
export class CarteBienComponent {
  readonly bien = input.required<BienDTO>();
  readonly lien = input.required<string | unknown[]>();
  readonly queryParams = input<Record<string, unknown> | null>(null);
  readonly disposition = input<'colonne' | 'ligne'>('colonne');
  readonly selectionne = input(false);

  readonly photo = computed(() => vignette(this.bien(), 0));

  readonly lieu = computed(() => {
    const b = this.bien();
    return [b.quartier, b.commune, b.ville].filter(v => v && v.trim()).join(', ');
  });

  /** Un atout de l'annonce : heures de courant (RDC), sinon le premier équipement. */
  readonly atout = computed(() => {
    const b = this.bien();
    if (b.heuresElectriciteParJour != null) return `Courant ${b.heuresElectriciteParJour} h par jour`;
    const e = b.equipements?.[0];
    return e ? LIBELLES_EQUIPEMENT[e] : '';
  });

  readonly caracteristiques = computed(() => {
    const b = this.bien();
    return [
      libelleTypeBien(b.typeBien),
      b.nombrePieces ? `${b.nombrePieces} pièce${b.nombrePieces > 1 ? 's' : ''}` : '',
      b.surfaceHabitable ? `${b.surfaceHabitable} m²` : '',
      b.meuble ? 'meublé' : '',
    ].filter(Boolean).join(' · ');
  });
}
