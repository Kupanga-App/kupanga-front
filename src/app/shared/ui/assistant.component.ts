import { Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../components/icon/icon.component';

/**
 * Formulaire pas à pas plein écran (AUDIT.md §8.3) : un groupe court de questions par écran, barre de progression
 * fine, « Continuer » collé en bas (au pouce, au-dessus du clavier). Le contenu de l'étape est projeté.
 *
 * Le parent garde l'étape courante et la validité ; ce composant ne fait qu'afficher et émettre.
 */
@Component({
  selector: 'kp-assistant',
  standalone: true,
  imports: [IconComponent],
  template: `
    <header class="haut">
      <button type="button" class="kp-icon-btn" (click)="quitter.emit()" [attr.aria-label]="libelleQuitter()">
        <kp-icon name="x" [size]="24" />
      </button>
      <span class="titre kp-ellipsis">{{ titre() }}</span>
      <span class="compteur">{{ etape() + 1 }} / {{ etapes().length }}</span>
    </header>
    <div class="progression" role="progressbar" [attr.aria-valuenow]="etape() + 1" aria-valuemin="1"
         [attr.aria-valuemax]="etapes().length" [attr.aria-label]="'Étape ' + (etape() + 1) + ' sur ' + etapes().length">
      <span [style.width.%]="pourcentage()"></span>
    </div>

    <main class="corps">
      <h1>{{ etapes()[etape()] }}</h1>
      @if (aide()) {
        <p class="aide">{{ aide() }}</p>
      }
      <div class="contenu"><ng-content /></div>
    </main>

    <footer class="bas">
      @if (erreur()) {
        <p class="kp-erreur" role="alert">{{ erreur() }}</p>
      }
      <div class="boutons">
        @if (etape() > 0) {
          <button type="button" class="kp-btn kp-btn--secondary" (click)="precedent.emit()" [disabled]="enCours()">Retour</button>
        }
        <button type="button" class="kp-btn kp-btn--primary" (click)="suivant.emit()" [disabled]="!peutContinuer() || enCours()">
          @if (enCours()) {
            <span class="kp-spinner"></span>
          }
          {{ derniere() ? libelleFin() : 'Continuer' }}
        </button>
      </div>
    </footer>
  `,
  styles: [`
    :host {
      display: flex; flex-direction: column; min-height: 100dvh;
      max-width: 720px; margin: 0 auto; background: var(--kp-bg);
    }
    .haut {
      position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 8px;
      min-height: calc(56px + var(--kp-safe-top)); padding: var(--kp-safe-top) 8px 0; background: var(--kp-bg);
    }
    .titre { flex: 1; font-weight: 600; color: var(--kp-text-2); }
    .compteur { padding-right: 12px; color: var(--kp-text-3); font-size: var(--kp-fs-sm); font-variant-numeric: tabular-nums; }
    .progression { height: 4px; margin: 0 16px; border-radius: 2px; background: var(--kp-surface-3); overflow: hidden; }
    .progression span { display: block; height: 100%; background: var(--kp-primary); transition: width var(--kp-duree); }
    .corps { flex: 1; padding: 24px 16px 16px; }
    h1 { font-size: var(--kp-fs-xl); }
    .aide { margin-top: 6px; color: var(--kp-text-3); }
    .contenu { margin-top: 24px; }
    .bas {
      position: sticky; bottom: 0; z-index: 20; display: flex; flex-direction: column; gap: 8px;
      padding: 12px 16px calc(12px + var(--kp-safe-bottom)); background: var(--kp-bg); border-top: 1px solid var(--kp-border);
    }
    .boutons { display: flex; gap: 12px; }
    .boutons .kp-btn { flex: 1; }
    @media (min-width: 768px) {
      .corps { padding: 32px 32px 16px; }
      .bas { padding: 16px 32px 24px; }
      .boutons { justify-content: flex-end; }
      .boutons .kp-btn { flex: 0 0 auto; min-width: 160px; }
    }
  `],
})
export class AssistantComponent {
  readonly titre = input.required<string>();
  /** Titre de chaque étape (question posée à l'écran). */
  readonly etapes = input.required<string[]>();
  readonly etape = input.required<number>();
  readonly aide = input<string | null>(null);
  readonly peutContinuer = input(true);
  readonly enCours = input(false);
  readonly erreur = input<string | null>(null);
  readonly libelleFin = input('Valider');
  readonly libelleQuitter = input('Quitter');

  readonly precedent = output<void>();
  readonly suivant = output<void>();
  readonly quitter = output<void>();

  readonly derniere = computed(() => this.etape() >= this.etapes().length - 1);
  readonly pourcentage = computed(() => ((this.etape() + 1) / this.etapes().length) * 100);
}
