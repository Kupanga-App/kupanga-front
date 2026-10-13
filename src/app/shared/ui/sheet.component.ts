import { Component, DestroyRef, effect, inject, input, model, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { IconComponent } from '../components/icon/icon.component';

let feuillesOuvertes = 0;

/**
 * Feuille du bas (téléphone) / boîte de dialogue (tablette, ordinateur) : choix, filtres, actions, confirmations.
 * Poignée à glisser vers le bas pour fermer, Échap, toucher le fond. Le pied (`<… pied>`) reste visible.
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
      <div class="feuille" [class.feuille--plein]="plein()" role="dialog" aria-modal="true" [attr.aria-label]="titre()"
           cdkTrapFocus [cdkTrapFocusAutoCapture]="true"
           [style.transform]="decalage() ? 'translateY(' + decalage() + 'px)' : null"
           (keydown.escape)="fermer()">
        <div class="entete"
             (pointerdown)="debutGlisser($event)" (pointermove)="glisser($event)"
             (pointerup)="finGlisser()" (pointercancel)="finGlisser()">
          <span class="poignee" aria-hidden="true"></span>
          <div class="entete__ligne">
            <h2>{{ titre() }}</h2>
            <button type="button" class="kp-icon-btn" (click)="fermer()" aria-label="Fermer">
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
      background: var(--kp-surface); color: var(--kp-text-1);
      border-radius: var(--kp-radius-lg) var(--kp-radius-lg) 0 0;
      box-shadow: var(--kp-shadow);
      padding-bottom: var(--kp-safe-bottom);
      animation: kp-monte var(--kp-duree) ease-out;
      touch-action: pan-y;
    }
    .feuille--plein { height: calc(100dvh - var(--kp-safe-top) - 8px); max-height: none; }
    .entete { padding: 8px 8px 0 20px; touch-action: none; cursor: grab; }
    .poignee { display: block; width: 40px; height: 4px; margin: 0 auto 4px; border-radius: 2px; background: var(--kp-border-strong); }
    .entete__ligne { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    h2 { font-size: var(--kp-fs-lg); }
    .contenu { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 8px 20px 16px; }
    .pied { display: flex; gap: 12px; padding: 12px 20px 16px; border-top: 1px solid var(--kp-border); }
    .pied:empty { display: none; }
    .pied ::ng-deep > * > .kp-btn, .pied ::ng-deep .kp-btn { flex: 1; }
    @media (min-width: 768px) {
      .feuille, .feuille--plein {
        left: 50%; top: 50%; bottom: auto; right: auto;
        width: min(560px, calc(100vw - 48px)); height: auto; max-height: min(85dvh, 760px);
        border-radius: var(--kp-radius-lg); padding-bottom: 0;
        transform: translate(-50%, -50%) !important;
        animation: kp-fondu var(--kp-duree) ease-out;
      }
      .poignee { display: none; }
      .entete { cursor: default; padding-top: 12px; }
    }
    @keyframes kp-fondu { from { opacity: 0; } }
    @keyframes kp-monte { from { transform: translateY(100%); } }
  `],
})
export class SheetComponent {
  readonly ouvert = model(false);
  readonly titre = input.required<string>();
  /** Pleine hauteur sur téléphone (signature, formulaire long). */
  readonly plein = input(false);

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
