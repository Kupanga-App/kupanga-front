import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BienDTO, libelleTypeBien, vignette } from '../../features/biens/models/bien.model';
import { MontantPipe } from '../../core/money/montant';
import { IconComponent } from '../components/icon/icon.component';

/** Carte d'un bien (annonces, biens du propriétaire) : photo, loyer, titre, lieu, caractéristiques. */
@Component({
  selector: 'kp-carte-bien',
  standalone: true,
  imports: [RouterLink, MontantPipe, IconComponent],
  template: `
    <a class="carte" [routerLink]="lien()">
      <div class="photo">
        @if (photo(); as p) {
          <img [src]="p" alt="" loading="lazy" decoding="async" />
        } @else {
          <span class="sans-photo"><kp-icon name="image" [size]="28" /></span>
        }
        <span class="statut"><ng-content select="[statut]" /></span>
      </div>
      <div class="infos">
        @if (bien().loyerMensuel != null) {
          <p class="prix"><span class="kp-montant">{{ bien().loyerMensuel | montant: bien().devise : 0 }}</span> <span class="kp-muted kp-small">/ mois</span></p>
        }
        <p class="titre">{{ bien().titre }}</p>
        <p class="lieu kp-ellipsis"><kp-icon name="map-pin" [size]="14" /> {{ lieu() }}</p>
        @if (caracteristiques()) {
          <p class="kp-small kp-muted">{{ caracteristiques() }}</p>
        }
        <ng-content />
      </div>
    </a>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .carte {
      display: flex; flex-direction: column; height: 100%; overflow: hidden;
      border: 1px solid var(--kp-border); border-radius: var(--kp-radius); background: var(--kp-surface);
      color: var(--kp-text-1); text-decoration: none;
    }
    .carte:hover { border-color: var(--kp-border-strong); }
    .photo { position: relative; aspect-ratio: 4 / 3; background: var(--kp-surface-2); }
    .photo img { width: 100%; height: 100%; object-fit: cover; }
    .sans-photo { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--kp-text-3); }
    .statut { position: absolute; top: 8px; left: 8px; }
    .statut:empty { display: none; }
    .infos { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px 14px; }
    .prix { font-size: var(--kp-fs-lg); }
    .titre { font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .lieu { display: flex; align-items: center; gap: 4px; color: var(--kp-text-3); font-size: var(--kp-fs-sm); }
  `],
})
export class CarteBienComponent {
  readonly bien = input.required<BienDTO>();
  readonly lien = input.required<string | unknown[]>();

  readonly photo = computed(() => vignette(this.bien(), 0));

  readonly lieu = computed(() => {
    const b = this.bien();
    return [b.quartier, b.commune, b.ville].filter(v => v && v.trim()).join(', ');
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
