import { Component, DestroyRef, effect, inject, input, model, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { IconComponent } from '../components/icon/icon.component';

let feuillesOuvertes = 0;

/**
 * Panneau qui monte (téléphone) ; sur tablette et ordinateur, fenêtre centrée (`forme="fenetre"`, par défaut :
 * confirmer, décider) ou panneau latéral droit (`forme="panneau"` : consulter sans perdre la liste).
 * Fond figé, fermeture par ✕, Échap, le voile ou la poignée glissée vers le bas ; focus piégé puis rendu.
 * Le pied (`<… pied>`) reste visible.
 *
 * `<kp-sheet [(ouvert)]="filtresOuverts" titre="Filtres"> … <div pied>…</div></kp-sheet>`
 */
@Component({
  selector: 'kp-sheet',
  standalone: true,
  imports: [A11yModule, IconComponent],
  template: `
    @if (ouvert()) {
      <div class="fond" (click)="fermer()"></div>
      <div class="feuille" [class.feuille--plein]="plein()" [class.feuille--panneau]="forme() === 'panneau'" role="dialog" aria-modal="true" [attr.aria-label]="titre()"
           cdkTrapFocus [cdkTrapFocusAutoCapture]="true"
           [style.transform]="decalage() ? 'translateY(' + decalage() + 'px)' : null"
           (keydown.escape)="fermer()">
        <div class="entete"
             (pointerdown)="debutGlisser($event)" (pointermove)="glisser($event)"
             (pointerup)="finGlisser()" (pointercancel)="finGlisser()">
          <span class="poignee" aria-hidden="true"></span>
          <div class="entete__ligne">
            <h2>{{ titre() }}</h2>
            <button type="button" class="kp-icon-btn kp-icon-btn--sm fermer" (click)="fermer()" aria-label="Fermer">
              <kp-icon name="x" />
            </button>
          </div>
        </div>
        <div class="contenu"><ng-content /></div>
        <div class="pied"><ng-content select="[pied]" /></div>
      </div>
    }
  `,
  styles: [`
    .fond {
      position: fixed; inset: 0; z-index: 900; background: var(--kp-backdrop);
      animation: kp-fondu var(--kp-duree) ease-out;
    }
    .feuille {
      position: fixed; z-index: 901; left: 0; right: 0; bottom: 0;
      display: flex; flex-direction: column;
      max-height: calc(92dvh - var(--kp-safe-top));
      background: var(--kp-surface); color: var(--kp-text);
      border-radius: var(--kp-radius-lg) var(--kp-radius-lg) 0 0;
      box-shadow: var(--kp-elev-2);
      padding-bottom: var(--kp-safe-bottom);
      animation: kp-monte var(--kp-duree-lente) var(--kp-ease);
      touch-action: pan-y;
    }
    .feuille--plein { height: calc(100dvh - var(--kp-safe-top) - 8px); max-height: none; }
    .entete { padding: 8px 12px 0 20px; touch-action: none; cursor: grab; }
    .poignee { display: block; width: 36px; height: 4px; margin: 0 auto 4px; border-radius: var(--kp-radius-pill); background: var(--kp-border-strong); }
    .entete__ligne { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    h2 { font-size: var(--kp-fs-card-title); font-weight: 500; }
    .fermer { color: var(--kp-text-subtle); }
    .contenu { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 8px 20px 16px; color: var(--kp-text-muted); font-size: 14px; }
    .pied { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 20px; }
    .pied:empty { display: none; }
    .pied ::ng-deep > * > .kp-btn, .pied ::ng-deep .kp-btn { flex: 1; }
    @media (min-width: 768px) {
      .feuille, .feuille--plein {
        left: 50%; top: 50%; bottom: auto; right: auto;
        width: min(560px, calc(100vw - 48px)); height: auto; max-height: min(85dvh, 760px);
        border-radius: var(--kp-radius-lg); padding-bottom: 0;
        transform: translate(-50%, -50%) !important;
        animation: kp-fondu var(--kp-duree) var(--kp-ease);
      }
      .feuille--panneau, .feuille--panneau.feuille--plein {
        left: auto; right: 8px; top: 8px; bottom: 8px;
        width: min(440px, calc(100vw - 48px)); height: auto; max-height: none;
        transform: none !important;
        animation: kp-glisse var(--kp-duree-lente) var(--kp-ease);
      }
      .poignee { display: none; }
      .entete { cursor: default; padding-top: 12px; }
      .pied ::ng-deep > * > .kp-btn, .pied ::ng-deep .kp-btn { flex: 0 0 auto; }
      .feuille--panneau .pied ::ng-deep > * > .kp-btn, .feuille--panneau .pied ::ng-deep .kp-btn { flex: 1; }
    }
    @keyframes kp-fondu { from { opacity: 0; } }
    @keyframes kp-monte { from { transform: translateY(100%); } }
    @keyframes kp-glisse { from { transform: translateX(24px); opacity: 0; } }
  `],
})
export class SheetComponent {
  readonly ouvert = model(false);
  readonly titre = input.required<string>();
  /** Pleine hauteur sur téléphone (signature, formulaire long). */
  readonly plein = input(false);
  /** Tablette et ordinateur : fenêtre centrée ou panneau latéral droit. */
  readonly forme = input<'fenetre' | 'panneau'>('fenetre');

  readonly decalage = signal(0);
  private depart: number | null = null;

  private bloque = false;

  constructor() {
    // Défilement de la page bloqué tant qu'au moins une feuille est ouverte
    effect(() => this.bloquerDefilement(this.ouvert()));
    inject(DestroyRef).onDestroy(() => this.bloquerDefilement(false));
  }

  private bloquerDefilement(bloquer: boolean): void {
    if (bloquer === this.bloque) return;
    this.bloque = bloquer;
    feuillesOuvertes += bloquer ? 1 : -1;
    document.body.style.overflow = feuillesOuvertes > 0 ? 'hidden' : '';
  }

  fermer(): void {
    this.decalage.set(0);
    this.ouvert.set(false);
  }

  debutGlisser(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('button')) return;
    this.depart = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  glisser(e: PointerEvent): void {
    if (this.depart === null) return;
    this.decalage.set(Math.max(0, e.clientY - this.depart));
  }

  finGlisser(): void {
    if (this.depart === null) return;
    this.depart = null;
    if (this.decalage() > 100) {
      this.fermer();
    } else {
      this.decalage.set(0);
    }
  }
}
