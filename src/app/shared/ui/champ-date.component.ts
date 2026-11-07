import { Component, ElementRef, computed, forwardRef, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../components/icon/icon.component';
import { aujourdhuiIso, dateLongue } from '../format';
import { STYLES_CHAMP_LISTE, fermerPopover, ouvrirPopover, placerSous } from './popover';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = [['L', 'lundi'], ['M', 'mardi'], ['M', 'mercredi'], ['J', 'jeudi'], ['V', 'vendredi'], ['S', 'samedi'], ['D', 'dimanche']];

/** « 2026-11-08 » (date locale, pas de décalage UTC). */
export function iso(a: number, m: number, j: number): string {
  return `${a}-${String(m + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
}

interface Jour {
  iso: string;
  numero: number;
  horsMois: boolean;
  interdit: boolean;
}

/**
 * Champ de date au style Kupanga, à la place de `<input type="date">` dont le calendrier est dessiné par le
 * navigateur. Même valeur (« AAAA-MM-JJ », chaîne vide si aucune), mêmes bornes `min` / `max` ; branché sur
 * `formControlName` ou `ngModel`. Calendrier au clavier : flèches (jour, semaine), Page précédente / suivante (mois),
 * Début / Fin (semaine), Entrée pour choisir, Échap pour fermer.
 *
 * `<label for="dateDebut">…</label> <kp-champ-date idChamp="dateDebut" formControlName="dateDebut" [min]="aujourdhui" />`
 */
@Component({
  selector: 'kp-champ-date',
  standalone: true,
  imports: [IconComponent],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ChampDateComponent), multi: true }],
  template: `
    <button #declencheur type="button" class="kp-input declencheur" [id]="idChamp()" [disabled]="desactive()"
            aria-haspopup="dialog" [attr.aria-expanded]="ouvert()" (click)="basculer()" (keydown.arrowDown)="ouvrir(); $event.preventDefault()">
      <span class="valeur" [class.vide]="!valeur()">{{ valeur() ? libelle() : placeholder() }}</span>
      <kp-icon name="calendar" [size]="18" [strokeWidth]="1.75" />
    </button>

    <div #panneau popover="auto" class="panneau" role="dialog" aria-label="Choisir une date" (toggle)="surBascule($event)">
      <div class="entete">
        <button type="button" class="kp-icon-btn kp-icon-btn--sm" (click)="changerMois(-1)" [disabled]="!moisPrecedentPossible()" aria-label="Mois précédent">
          <kp-icon name="chevron-left" [size]="18" />
        </button>
        <span class="mois" aria-live="polite">{{ titreMois() }}</span>
        <button type="button" class="kp-icon-btn kp-icon-btn--sm" (click)="changerMois(1)" [disabled]="!moisSuivantPossible()" aria-label="Mois suivant">
          <kp-icon name="chevron-right" [size]="18" />
        </button>
      </div>
      <div class="grille" role="grid" [attr.aria-label]="titreMois()" (keydown)="clavier($event)">
        <div class="ligne" role="row">
          @for (j of jours; track $index) {
            <span class="jour-semaine" role="columnheader" [attr.aria-label]="j[1]">{{ j[0] }}</span>
          }
        </div>
        @for (semaine of semaines(); track $index) {
          <div class="ligne" role="row">
            @for (j of semaine; track j.iso) {
              <span role="gridcell" [attr.aria-selected]="j.iso === valeur()">
                <button type="button" class="jour" [attr.data-iso]="j.iso" [class.hors-mois]="j.horsMois"
                        [class.aujourdhui]="j.iso === aujourdhui" [class.choisi]="j.iso === valeur()"
                        [attr.aria-disabled]="j.interdit || null" [attr.tabindex]="j.iso === focal() ? 0 : -1"
                        [attr.aria-label]="libelleLong(j.iso)" [attr.aria-current]="j.iso === aujourdhui ? 'date' : null"
                        (click)="choisir(j.iso)">{{ j.numero }}</button>
              </span>
            }
          </div>
        }
      </div>
      <div class="pied">
        <button type="button" class="lien" (click)="choisir(aujourdhui)" [disabled]="interdit(aujourdhui)">Aujourd’hui</button>
        @if (effacable()) {
          <button type="button" class="lien" (click)="choisir('')" [disabled]="!valeur()">Effacer</button>
        }
      </div>
    </div>
  `,
  styles: [STYLES_CHAMP_LISTE, `
    .panneau { width: 320px; max-width: calc(100vw - 16px); }
    .entete { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    .mois { font-weight: 500; }
    .mois::first-letter { text-transform: uppercase; }
    .grille { display: flex; flex-direction: column; gap: 2px; }
    .ligne { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .jour-semaine { display: grid; place-items: center; height: 28px; color: var(--kp-text-subtle); font-size: var(--kp-fs-mention); }
    .jour {
      display: grid; place-items: center; width: 100%; aspect-ratio: 1; max-height: 40px; border: 0; border-radius: 50%;
      background: none; color: var(--kp-text); font-size: 14px; font-variant-numeric: tabular-nums; cursor: pointer;
    }
    .jour:hover:not([aria-disabled]):not(.choisi) { background: var(--kp-bg); }
    .jour.hors-mois { color: var(--kp-text-subtle); }
    .jour.aujourdhui { box-shadow: inset 0 0 0 1.5px var(--kp-accent); color: var(--kp-accent); font-weight: 500; }
    .jour.choisi { background: var(--kp-text); color: var(--kp-text-on-accent); box-shadow: none; font-weight: 500; }
    .jour[aria-disabled] { opacity: 0.35; cursor: not-allowed; }
  `],
})
export class ChampDateComponent implements ControlValueAccessor {
  /** Identifiant du bouton (cible du `<label for>`). */
  readonly idChamp = input<string | null>(null);
  readonly min = input<string | null | undefined>(null);
  readonly max = input<string | null | undefined>(null);
  readonly placeholder = input('Choisir une date');
  /** Bouton « Effacer » (champ facultatif). */
  readonly effacable = input(false);

  private readonly declencheur = viewChild.required<ElementRef<HTMLButtonElement>>('declencheur');
  private readonly panneau = viewChild.required<ElementRef<HTMLElement>>('panneau');

  readonly valeur = signal('');
  readonly desactive = signal(false);
  readonly ouvert = signal(false);
  /** Mois affiché (année, mois 0-11) et jour qui a le focus clavier. */
  readonly vue = signal<{ a: number; m: number }>({ a: new Date().getFullYear(), m: new Date().getMonth() });
  readonly focal = signal('');

  readonly aujourdhui = aujourdhuiIso();
  readonly jours = JOURS;

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly libelle = computed(() => dateLongue(this.valeur()));
  readonly titreMois = computed(() => `${MOIS[this.vue().m]} ${this.vue().a}`);

  /** Six semaines du lundi au dimanche autour du mois affiché. */
  readonly semaines = computed<Jour[][]>(() => {
    const { a, m } = this.vue();
    const premier = new Date(a, m, 1);
    const decalage = (premier.getDay() + 6) % 7;
    const semaines: Jour[][] = [];
    for (let s = 0; s < 6; s++) {
      const semaine: Jour[] = [];
      for (let k = 0; k < 7; k++) {
        const d = new Date(a, m, 1 - decalage + s * 7 + k);
        const v = iso(d.getFullYear(), d.getMonth(), d.getDate());
        semaine.push({ iso: v, numero: d.getDate(), horsMois: d.getMonth() !== m, interdit: this.interdit(v) });
      }
      semaines.push(semaine);
    }
    return semaines;
  });

  readonly moisPrecedentPossible = computed(() => {
    const { a, m } = this.vue();
    const min = this.min();
    return !min || iso(a, m, 1) > min;
  });
  readonly moisSuivantPossible = computed(() => {
    const { a, m } = this.vue();
    const max = this.max();
    const suivant = new Date(a, m + 1, 1);
    return !max || iso(suivant.getFullYear(), suivant.getMonth(), 1) <= max;
  });

  interdit(v: string): boolean {
    const min = this.min();
    const max = this.max();
    return (!!min && v < min) || (!!max && v > max);
  }

  libelleLong(v: string): string {
    const d = new Date(Number(v.slice(0, 4)), Number(v.slice(5, 7)) - 1, Number(v.slice(8, 10)));
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ── ControlValueAccessor ───────────────────────────────────────────────────

  writeValue(v: string | null | undefined): void {
    this.valeur.set(v ?? '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(desactive: boolean): void {
    this.desactive.set(desactive);
  }

  // ── Ouverture ──────────────────────────────────────────────────────────────

  basculer(): void {
    if (this.ouvert()) this.fermer(); else this.ouvrir();
  }

  ouvrir(): void {
    if (this.desactive()) return;
    const depart = this.valeur() || (this.interdit(this.aujourdhui) ? this.min() || this.max() || this.aujourdhui : this.aujourdhui);
    this.vue.set({ a: Number(depart.slice(0, 4)), m: Number(depart.slice(5, 7)) - 1 });
    this.focal.set(depart);
    const panneau = this.panneau().nativeElement;
    ouvrirPopover(panneau);
    placerSous(panneau, this.declencheur().nativeElement);
    this.ouvert.set(true);
    setTimeout(() => this.focaliser());
  }

  fermer(rendreFocus = true): void {
    fermerPopover(this.panneau().nativeElement);
    this.ouvert.set(false);
    this.onTouched();
    if (rendreFocus) this.declencheur().nativeElement.focus();
  }

  /** Fermeture par le navigateur (Échap, clic à l'extérieur). */
  surBascule(e: Event): void {
    if ((e as ToggleEvent).newState === 'closed' && this.ouvert()) {
      this.ouvert.set(false);
      this.onTouched();
    }
  }

  choisir(v: string): void {
    if (v && this.interdit(v)) return;
    this.valeur.set(v);
    this.onChange(v);
    this.fermer();
  }

  changerMois(delta: number): void {
    this.vue.update(({ a, m }) => {
      const d = new Date(a, m + delta, 1);
      return { a: d.getFullYear(), m: d.getMonth() };
    });
  }

  clavier(e: KeyboardEvent): void {
    const pas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const f = this.focal();
    if (!f) return;
    const d = new Date(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
    if (e.key in pas) d.setDate(d.getDate() + pas[e.key]);
    else if (e.key === 'PageUp') d.setMonth(d.getMonth() - 1);
    else if (e.key === 'PageDown') d.setMonth(d.getMonth() + 1);
    else if (e.key === 'Home') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    else if (e.key === 'End') d.setDate(d.getDate() + (6 - ((d.getDay() + 6) % 7)));
    else return;
    e.preventDefault();
    const v = iso(d.getFullYear(), d.getMonth(), d.getDate());
    this.focal.set(v);
    this.vue.set({ a: d.getFullYear(), m: d.getMonth() });
    setTimeout(() => this.focaliser());
  }

  private focaliser(): void {
    this.panneau().nativeElement.querySelector<HTMLButtonElement>(`.jour[data-iso="${this.focal()}"]`)?.focus();
  }
}
