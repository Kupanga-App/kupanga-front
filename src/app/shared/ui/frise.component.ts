import { Component, input } from '@angular/core';
import { IconComponent } from '../components/icon/icon.component';

export type EtatEtape = 'fait' | 'en-cours' | 'a-venir';

export interface EtapeFrise {
  libelle: string;
  /** Précision sous le libellé (« Lucas a accepté », « À créer »). */
  detail?: string | null;
  etat: EtatEtape;
  /** Icône Lucide de l'étape en cours (sinon : coche pour une étape faite, numéro pour une étape à venir). */
  icone?: string | null;
}

const LIBELLES_ETAT: Record<EtatEtape, string> = {
  fait: 'terminée',
  'en-cours': 'en cours',
  'a-venir': 'à venir',
};

/**
 * Frise d'étapes (demande, réservé, bail, état des lieux, emménagement) : faites en olive, en cours avec halo,
 * à venir en gris. Purement visuelle : l'écran calcule les étapes et leur état.
 * Horizontale à partir de 768 px, verticale sur téléphone.
 *
 * `<kp-frise titre="Où en est la location" [etapes]="etapes()" />`
 */
@Component({
  selector: 'kp-frise',
  standalone: true,
  imports: [IconComponent],
  template: `
    <ol class="frise" [attr.aria-label]="titre()" [style.--colonnes]="etapes().length">
      @for (e of etapes(); track $index; let dernier = $last; let i = $index) {
        <li [class]="'etape etape--' + e.etat" [attr.aria-current]="e.etat === 'en-cours' ? 'step' : null">
          <span class="repere">
            <span class="pastille" aria-hidden="true">
              @switch (e.etat) {
                @case ('fait') { <kp-icon name="check" [size]="16" [strokeWidth]="2" /> }
                @case ('en-cours') {
                  @if (e.icone) { <kp-icon [name]="e.icone" [size]="16" [strokeWidth]="1.5" /> } @else { {{ i + 1 }} }
                }
                @default { {{ i + 1 }} }
              }
            </span>
            @if (!dernier) {
              <span class="lien" aria-hidden="true"></span>
            }
          </span>
          <span class="texte">
            <span class="libelle">{{ e.libelle }}<span class="kp-sr-only"> ({{ libelleEtat[e.etat] }})</span></span>
            @if (e.detail) {
              <span class="detail">{{ e.detail }}</span>
            }
          </span>
        </li>
      }
    </ol>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .frise { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .etape { display: flex; gap: 12px; min-width: 0; }
    .repere { display: flex; flex-direction: column; align-items: center; flex: none; }
    .pastille {
      display: grid; place-items: center; flex: none; width: 36px; height: 36px; border-radius: 50%;
      font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums;
    }
    .lien { flex: 1; width: 2px; min-height: 16px; margin: 6px 0; border-radius: 2px; background: var(--kp-segment-bg); }
    .texte { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 7px 0 16px; }
    .libelle { font-size: 14px; font-weight: 500; color: var(--kp-text); }
    .detail { font-size: var(--kp-fs-secondary); color: var(--kp-text-subtle); }

    .etape--fait .pastille { background: var(--kp-accent-soft); color: var(--kp-accent); }
    .etape--fait .lien { background: var(--kp-accent); }
    .etape--en-cours .pastille {
      background: var(--kp-text); color: var(--kp-text-on-accent);
      animation: kp-halo 1800ms var(--kp-ease) 1200ms infinite;
    }
    .etape--a-venir .pastille { background: var(--kp-surface); color: var(--kp-text-subtle); box-shadow: inset 0 0 0 1.5px var(--kp-border-strong); }
    .etape--a-venir .libelle { color: var(--kp-text-subtle); }

    @keyframes kp-halo {
      from { box-shadow: 0 0 0 0 color-mix(in srgb, var(--kp-accent) 35%, transparent); }
      to { box-shadow: 0 0 0 12px color-mix(in srgb, var(--kp-accent) 0%, transparent); }
    }
    @media (prefers-reduced-motion: reduce) {
      .etape--en-cours .pastille { animation: none; box-shadow: 0 0 0 4px var(--kp-accent-soft); }
    }

    @media (min-width: 768px) {
      .frise { display: grid; grid-template-columns: repeat(var(--colonnes), minmax(0, 1fr)); }
      .etape { flex-direction: column; gap: 10px; }
      .repere { flex-direction: row; }
      .lien { width: auto; height: 2px; min-height: 0; margin: 0 8px; }
      .texte { padding: 0 12px 0 0; }
    }
  `],
})
export class FriseComponent {
  readonly etapes = input.required<EtapeFrise[]>();
  readonly titre = input('Étapes');
  protected readonly libelleEtat = LIBELLES_ETAT;
}
