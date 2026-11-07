import { Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from '../components/icon/icon.component';
import { SheetComponent } from './sheet.component';

/**
 * Formulaire pas à pas plein écran (AUDIT.md §8.3, maquettes `Assist-Bail`, `Assist-EDL`) : un groupe court de
 * questions par écran. Téléphone : barre de progression fine, « Continuer » collé en bas (au pouce, au-dessus du
 * clavier). Ordinateur : barre du haut, étapes à gauche (`disposition="laterale"`) ou dans la barre
 * (`disposition="haut"`), formulaire dans une carte, aperçu à droite (`[apercu]="true"` + `<… apercu>`).
 *
 * Le parent garde l'étape courante et la validité ; ce composant affiche et émet. `manque` dit ce qui bloque
 * « Continuer » ; `modifie` (formulaire `dirty`) fait confirmer « Quitter » avant d'émettre `quitter`.
 * `confirmerSortie()` pose la même question pour une sortie par le retour du navigateur (garde `sortieAssistantGuard`).
 */
@Component({
  selector: 'kp-assistant',
  standalone: true,
  imports: [IconComponent, SheetComponent],
  template: `
    <header class="haut">
      <button type="button" class="kp-icon-btn fermer" (click)="demanderQuitter()" [attr.aria-label]="libelleQuitter()">
        <kp-icon name="x" [size]="22" />
      </button>
      <div class="titres">
        <span class="titre kp-ellipsis">{{ titre() }}</span>
        @if (sousTitre()) {
          <span class="sous-titre kp-ellipsis">{{ sousTitre() }}</span>
        }
      </div>
      @if (disposition() === 'haut') {
        <ol class="etapes-haut" aria-label="Étapes">
          @for (e of libellesCourts(); track $index; let i = $index) {
            <li [class]="'etape-haut ' + etat(i)" [attr.aria-current]="i === etape() ? 'step' : null">
              <span class="pastille" aria-hidden="true">
                @if (i < etape()) { <kp-icon name="check" [size]="12" [strokeWidth]="2.5" /> } @else { {{ i + 1 }} }
              </span>
              {{ e }}
            </li>
          }
        </ol>
      }
      <span class="compteur">{{ etape() + 1 }} / {{ etapes().length }}</span>
    </header>
    <div class="progression" role="progressbar" [attr.aria-valuenow]="etape() + 1" aria-valuemin="1"
         [attr.aria-valuemax]="etapes().length" [attr.aria-label]="'Étape ' + (etape() + 1) + ' sur ' + etapes().length">
      <span [style.width.%]="pourcentage()"></span>
    </div>

    <div class="cadre" [class.cadre--laterale]="disposition() === 'laterale'" [class.cadre--apercu]="apercu()">
      @if (disposition() === 'laterale') {
        <nav class="etapes" aria-label="Étapes">
          <span class="etapes__compte">Étape {{ etape() + 1 }} sur {{ etapes().length }}</span>
          <ol>
            @for (e of libellesCourts(); track $index; let i = $index) {
              <li [class]="'etape ' + etat(i)" [attr.aria-current]="i === etape() ? 'step' : null">
                <span class="pastille" aria-hidden="true">
                  @if (i < etape()) { <kp-icon name="check" [size]="14" [strokeWidth]="2.5" /> } @else { {{ i + 1 }} }
                </span>
                <span class="etape__texte">
                  <span class="etape__libelle">{{ e }}</span>
                  @if (i < etape() && resumes()[i]) {
                    <span class="etape__resume">{{ resumes()[i] }}</span>
                  }
                </span>
              </li>
            }
          </ol>
          @if (note()) {
            <p class="etapes__note">{{ note() }}</p>
          }
        </nav>
      }

      <section class="carte">
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
          <div class="bas__ligne">
            <p class="etat" aria-live="polite">
              <span class="etat__etape">Étape {{ etape() + 1 }} sur {{ etapes().length }}</span>
              @if (manqueVisible()) {
                <span class="manque"><span class="etat__etape"> · </span>{{ manque() }}</span>
              }
            </p>
            <div class="boutons">
              @if (etape() > 0) {
                <button type="button" class="kp-btn kp-btn--secondary" (click)="precedent.emit()" [disabled]="enCours()">Retour</button>
              }
              <ng-content select="[actions]" />
              <button type="button" class="kp-btn kp-btn--primary" (click)="suivant.emit()" [disabled]="!peutContinuer() || enCours()"
                      [attr.aria-describedby]="manqueVisible() ? 'kp-assistant-manque' : null">
                @if (enCours()) {
                  <span class="kp-spinner"></span>
                }
                {{ derniere() ? libelleFin() : 'Continuer' }}
              </button>
            </div>
          </div>
          @if (manqueVisible()) {
            <span class="kp-sr-only" id="kp-assistant-manque">{{ manque() }}</span>
          }
        </footer>
      </section>

      @if (apercu()) {
        <aside class="apercu" aria-label="Aperçu"><ng-content select="[apercu]" /></aside>
      }
    </div>

    <kp-sheet [ouvert]="confirmation()" (ouvertChange)="fermerConfirmation($event)" titre="Quitter sans enregistrer ?">
      <p>Ce que vous avez saisi sera perdu : rien n’est enregistré avant la dernière étape.</p>
      <div pied>
        <button type="button" class="kp-btn kp-btn--secondary" (click)="fermerConfirmation(false)">Continuer la saisie</button>
        <button type="button" class="kp-btn kp-btn--danger" (click)="confirmerQuitter()">Quitter</button>
      </div>
    </kp-sheet>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100dvh; background: var(--kp-bg); }

    /* Barre du haut */
    .haut {
      position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px;
      min-height: calc(56px + var(--kp-safe-top)); padding: var(--kp-safe-top) 12px 0 8px; background: var(--kp-bg);
    }
    .fermer { flex: none; }
    .titres { display: flex; flex: 1; flex-direction: column; min-width: 0; }
    .titre { font-weight: 500; color: var(--kp-text); }
    .sous-titre { color: var(--kp-text-muted); font-size: var(--kp-fs-secondary); }
    .compteur { flex: none; color: var(--kp-text-subtle); font-size: var(--kp-fs-secondary); font-variant-numeric: tabular-nums; }
    .etapes-haut { display: none; }
    .progression { height: 4px; margin: 0 16px; border-radius: 2px; background: var(--kp-segment-bg); overflow: hidden; }
    .progression span { display: block; height: 100%; background: var(--kp-accent); transition: width var(--kp-duree) var(--kp-ease); }

    /* Téléphone : une colonne */
    .cadre { display: flex; flex: 1; flex-direction: column; min-height: 0; }
    .etapes, .apercu { display: none; }
    .carte { display: flex; flex: 1; flex-direction: column; min-width: 0; }
    .corps { flex: 1; padding: 24px 16px 16px; }
    h1 { font-size: var(--kp-fs-page-title); font-weight: 500; }
    .aide { margin-top: 6px; color: var(--kp-text-muted); }
    .contenu { margin-top: 24px; }
    .bas {
      position: sticky; bottom: 0; z-index: 20; display: flex; flex-direction: column; gap: 8px;
      padding: 12px 16px calc(12px + var(--kp-safe-bottom)); background: var(--kp-bg); border-top: 1px solid var(--kp-border);
    }
    .bas__ligne { display: flex; flex-direction: column; gap: 8px; }
    .etat { margin: 0; color: var(--kp-text-subtle); font-size: var(--kp-fs-secondary); }
    .etat:not(:has(.manque)) { display: none; }
    .etat .etat__etape { display: none; }
    .manque { color: var(--kp-text-muted); }
    .boutons { display: flex; flex-wrap: wrap; gap: 8px 12px; }
    .boutons > .kp-btn, .boutons ::ng-deep > .kp-btn { flex: 1; }

    /* Tablette et ordinateur */
    @media (min-width: 768px) {
      .haut { min-height: 64px; padding: 0 24px 0 16px; border-bottom: 1px solid var(--kp-border); background: var(--kp-surface); }
      .fermer { background: var(--kp-bg); }
      .progression { display: none; }
      .cadre { gap: 16px; padding: 16px; }
      .carte { border-radius: var(--kp-radius-lg); background: var(--kp-surface); box-shadow: var(--kp-elev-0); max-width: 760px; width: 100%; margin: 0 auto; }
      .corps { padding: 28px 28px 16px; }
      .bas {
        position: sticky; bottom: 0; padding: 14px 24px; border-top: 1px solid var(--kp-border);
        background: var(--kp-surface); border-radius: 0 0 var(--kp-radius-lg) var(--kp-radius-lg);
      }
      .bas__ligne { flex-direction: row; align-items: center; justify-content: space-between; gap: 16px; }
      .etat, .etat:not(:has(.manque)) { display: block; flex: 1; min-width: 0; }
      .etat .etat__etape { display: inline; }
      .boutons { justify-content: flex-end; }
      .boutons > .kp-btn, .boutons ::ng-deep > .kp-btn { flex: 0 0 auto; }
      .boutons > .kp-btn--primary { min-width: 140px; }
      .compteur { display: none; }
    }

    @media (min-width: 1100px) {
      .cadre--laterale { display: grid; grid-template-columns: 220px minmax(0, 1fr); align-items: start; }
      .cadre--laterale:not(.cadre--apercu) { grid-template-columns: 220px minmax(0, 880px); justify-content: center; }
      .cadre--laterale.cadre--apercu { grid-template-columns: 220px minmax(0, 1fr) minmax(320px, 0.75fr); }
      .cadre--laterale .carte { max-width: none; min-height: calc(100dvh - 64px - 32px); }
      .cadre:not(.cadre--laterale) .carte { max-width: none; }
      .etapes {
        position: sticky; top: 80px; display: flex; flex-direction: column; gap: 12px;
        min-height: calc(100dvh - 64px - 32px); padding: 8px 0 0;
      }
      .etapes__compte { padding: 0 12px; color: var(--kp-text-subtle); font-size: var(--kp-fs-secondary); }
      .etapes ol { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
      .etape { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-radius: var(--kp-radius-pill); color: var(--kp-text-subtle); }
      .etape.en-cours { background: var(--kp-surface); color: var(--kp-text); box-shadow: var(--kp-elev-0); }
      .etape.fait { color: var(--kp-text); }
      .etape__texte { display: flex; flex-direction: column; min-width: 0; padding-top: 3px; }
      .etape__libelle { font-size: 14px; font-weight: 500; }
      .etape__resume { color: var(--kp-text-subtle); font-size: var(--kp-fs-mention); }
      .etapes__note {
        margin-top: auto; padding: 12px; border-radius: var(--kp-radius-md); background: var(--kp-surface-sunken);
        color: var(--kp-text-muted); font-size: var(--kp-fs-secondary);
      }
      .apercu {
        position: sticky; top: 80px; display: flex; flex-direction: column; gap: 12px;
        min-height: calc(100dvh - 64px - 32px); padding: 16px; border-radius: var(--kp-radius-lg); background: var(--kp-surface-sunken);
      }
      .etapes-haut { display: flex; align-items: center; gap: 4px; margin: 0 auto; padding: 0; list-style: none; }
      .etape-haut {
        display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px 0 6px;
        border-radius: var(--kp-radius-pill); color: var(--kp-text-subtle); font-size: 14px; font-weight: 500; white-space: nowrap;
      }
      .etape-haut.fait { color: var(--kp-text); }
      .etape-haut.en-cours { background: var(--kp-text); color: var(--kp-text-on-accent); }
      .etape-haut .pastille { width: 22px; height: 22px; font-size: 11px; }
      .etape-haut.en-cours .pastille { background: var(--kp-surface); color: var(--kp-text); box-shadow: none; }
      .titres { flex: 0 1 auto; max-width: 320px; }
    }

    .pastille {
      display: grid; place-items: center; flex: none; width: 26px; height: 26px; border-radius: 50%;
      font-size: 12px; font-weight: 500; font-variant-numeric: tabular-nums;
      background: var(--kp-surface); color: var(--kp-text-subtle); box-shadow: inset 0 0 0 1.5px var(--kp-border-strong);
    }
    .fait .pastille { background: var(--kp-accent-soft); color: var(--kp-accent); box-shadow: none; }
    .etape.en-cours .pastille { background: var(--kp-text); color: var(--kp-text-on-accent); box-shadow: none; }
  `],
})
export class AssistantComponent {
  readonly titre = input.required<string>();
  /** Sous le titre, dans la barre (« Lucas Bernard · Studio proche transports »). */
  readonly sousTitre = input<string | null>(null);
  /** Titre de chaque étape (question posée à l'écran). */
  readonly etapes = input.required<string[]>();
  /** Libellés courts des étapes pour la liste (sinon les titres). */
  readonly libelles = input<string[] | null>(null);
  /** Résumé d'une étape terminée sous son libellé (« 6 nov. 2026 · 1 an »). */
  readonly resumes = input<(string | null)[]>([]);
  /** Note en bas de la liste des étapes (ordinateur). */
  readonly note = input<string | null>(null);
  readonly etape = input.required<number>();
  readonly aide = input<string | null>(null);
  readonly peutContinuer = input(true);
  /** Ce qui empêche de continuer (affiché près du bouton tant qu'il est grisé). */
  readonly manque = input<string | null>(null);
  /** Saisie commencée : « Quitter » demande confirmation. */
  readonly modifie = input(false);
  readonly disposition = input<'laterale' | 'haut'>('laterale');
  /** Colonne d'aperçu à droite (ordinateur) : contenu projeté `<… apercu>`. */
  readonly apercu = input(false);
  readonly enCours = input(false);
  readonly erreur = input<string | null>(null);
  readonly libelleFin = input('Valider');
  readonly libelleQuitter = input('Quitter');

  readonly precedent = output<void>();
  readonly suivant = output<void>();
  readonly quitter = output<void>();

  readonly confirmation = signal(false);
  /** Sortie par le retour du navigateur en attente de réponse (`confirmerSortie`). */
  private reponseSortie: ((quitter: boolean) => void) | null = null;

  readonly derniere = computed(() => this.etape() >= this.etapes().length - 1);
  readonly pourcentage = computed(() => ((this.etape() + 1) / this.etapes().length) * 100);
  readonly libellesCourts = computed(() => this.libelles() ?? this.etapes());
  readonly manqueVisible = computed(() => !!this.manque() && !this.peutContinuer() && !this.enCours());

  etat(i: number): string {
    return i < this.etape() ? 'fait' : i === this.etape() ? 'en-cours' : 'a-venir';
  }

  demanderQuitter(): void {
    if (this.modifie() && !this.enCours()) {
      this.confirmation.set(true);
    } else {
      this.quitter.emit();
    }
  }

  confirmerQuitter(): void {
    this.confirmation.set(false);
    if (this.reponseSortie) {
      // La navigation demandée par le navigateur reprend : pas de second `quitter`
      this.repondreSortie(true);
      return;
    }
    this.quitter.emit();
  }

  /** « Continuer la saisie », ✕, Échap ou voile : la fenêtre se ferme et la sortie demandée est annulée. */
  fermerConfirmation(ouvert: boolean): void {
    if (ouvert) return;
    this.confirmation.set(false);
    this.repondreSortie(false);
  }

  /**
   * Sortie de l'écran sans passer par « Quitter » (retour du navigateur ou geste du téléphone) : même fenêtre que
   * « Quitter » si la saisie est commencée. Vrai si la sortie peut se faire.
   */
  confirmerSortie(): Promise<boolean> {
    if (!this.modifie() || this.enCours()) return Promise.resolve(true);
    this.repondreSortie(false);
    this.confirmation.set(true);
    return new Promise(resolve => (this.reponseSortie = resolve));
  }

  private repondreSortie(quitter: boolean): void {
    const reponse = this.reponseSortie;
    this.reponseSortie = null;
    reponse?.(quitter);
  }
}
