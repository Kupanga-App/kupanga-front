import { Component, ElementRef, afterRenderEffect, input, model, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface OptionSegment<T extends string = string> {
  valeur: T;
  libelle: string;
  /** Nombre affiché à côté du libellé (éléments à traiter). */
  nombre?: number | null;
}

/** Onglet de page qui mène à une adresse (fiche du bien, Mon logement). */
export interface OngletPage {
  libelle: string;
  lien: string | readonly unknown[];
  nombre?: number | null;
  /** Actif seulement sur l'adresse exacte (onglet « Vue d'ensemble » à la racine de la fiche). */
  exact?: boolean;
  /** Paramètres de l'adresse (onglet Messages de Mon logement : conversation avec le propriétaire). */
  queryParams?: Record<string, unknown> | null;
}

/**
 * Fait défiler la rangée pour que l'option active reste visible (défilement horizontal au-delà de
 * 5 options ou sur téléphone). Calcul manuel plutôt que `scrollIntoView` : la page ne bouge pas verticalement.
 */
function montrer(option: HTMLElement | null | undefined): void {
  const rangee = option?.parentElement;
  if (!option || !rangee || rangee.scrollWidth <= rangee.clientWidth) return;
  const gauche = option.offsetLeft - (rangee.clientWidth - option.offsetWidth) / 2;
  const doux = !matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  rangee.scrollTo?.({ left: Math.max(0, gauche), behavior: doux ? 'smooth' : 'auto' });
}

/**
 * Signature de l'interface (DS-Composants) : fond `--kp-segment-bg`, élément actif nuit plein.
 * Partagé par le contrôle segmenté et les onglets de page.
 */
const STYLES_SEGMENTS = `
  :host { display: flex; min-width: 0; max-width: 100%; }
  .segments {
    position: relative; display: inline-flex; gap: 4px; max-width: 100%; padding: 4px;
    overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none;
    border-radius: var(--kp-radius-pill); background: var(--kp-segment-bg);
  }
  .segments::-webkit-scrollbar { display: none; }
  :host(.plein) { display: flex; }
  :host(.plein) .segments { display: flex; width: 100%; }
  :host(.plein) .segment { flex: 1 0 auto; }
  .segment {
    flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: 36px; padding: 0 16px; border: 0; border-radius: var(--kp-radius-pill);
    background: transparent; color: var(--kp-text); font-size: 14px; font-weight: 500; line-height: 1.2;
    white-space: nowrap; text-decoration: none; cursor: pointer;
    transition: background-color var(--kp-duree) var(--kp-ease), color var(--kp-duree) var(--kp-ease);
  }
  .segment:hover:not(.actif) { background: color-mix(in srgb, var(--kp-surface) 55%, transparent); }
  .segment:focus-visible { border-radius: var(--kp-radius-pill); }
  .segment.actif { background: var(--kp-text); color: var(--kp-text-on-accent); }
  .nombre { font-size: 12px; font-weight: 500; color: var(--kp-text-subtle); font-variant-numeric: tabular-nums; }
  .actif .nombre { color: inherit; opacity: 0.72; }
  @media (max-width: 767px) {
    .segment { min-height: 32px; padding: 0 14px; font-size: 13px; }
  }
`;

/**
 * Contrôle segmenté (Baux / États des lieux / Quittances ; Loués / Vacants ; France / RDC).
 * Ajouter la classe `plein` sur l'élément pour occuper toute la largeur.
 */
@Component({
  selector: 'kp-segmented',
  standalone: true,
  template: `
    <div #rangee class="segments" role="group" [attr.aria-label]="libelle()">
      @for (o of options(); track o.valeur) {
        <button type="button" class="segment" [class.actif]="valeur() === o.valeur"
                [attr.aria-pressed]="valeur() === o.valeur" (click)="valeur.set(o.valeur)">
          {{ o.libelle }}
          @if (o.nombre) {
            <span class="nombre">{{ o.nombre }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [STYLES_SEGMENTS],
})
export class SegmentedComponent<T extends string = string> {
  readonly options = input.required<OptionSegment<T>[]>();
  readonly valeur = model.required<T>();
  readonly libelle = input('');

  private readonly rangee = viewChild<ElementRef<HTMLElement>>('rangee');

  constructor() {
    afterRenderEffect(() => {
      this.valeur();
      this.options();
      montrer(this.rangee()?.nativeElement.querySelector<HTMLElement>('.segment.actif'));
    });
  }
}

/**
 * Onglets de page en contrôle segmenté, chacun étant un lien (`routerLink`) : l'onglet actif suit l'adresse.
 *
 * `<kp-onglets libelle="Sections du bien" [onglets]="[{ libelle: 'Vue d’ensemble', lien: '.', exact: true }, …]" />`
 */
@Component({
  selector: 'kp-onglets',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="segments" [attr.aria-label]="libelle()">
      @for (o of onglets(); track o.libelle) {
        <a class="segment" [routerLink]="o.lien" [queryParams]="o.queryParams" routerLinkActive="actif" ariaCurrentWhenActive="page"
           [routerLinkActiveOptions]="{ exact: !!o.exact }" #lien
           (isActiveChange)="$event && montrer(lien)">
          {{ o.libelle }}
          @if (o.nombre) {
            <span class="nombre">{{ o.nombre }}</span>
          }
        </a>
      }
    </nav>
  `,
  styles: [STYLES_SEGMENTS],
})
export class OngletsComponent {
  readonly onglets = input.required<OngletPage[]>();
  readonly libelle = input.required<string>();

  protected montrer(lien: HTMLElement): void {
    // Après la mise en page (l'onglet vient d'être marqué actif)
    requestAnimationFrame(() => montrer(lien));
  }
}
