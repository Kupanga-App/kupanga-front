import { Component, ElementRef, computed, forwardRef, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../components/icon/icon.component';
import { STYLES_CHAMP_LISTE, fermerPopover, ouvrirPopover, placerSous } from './popover';

const deux = (n: number) => String(n).padStart(2, '0');

/**
 * Champ d'heure au style Kupanga, à la place de `<input type="time">` dont la liste est dessinée par le navigateur.
 * Même valeur (« HH:mm », chaîne vide si aucune) ; branché sur `formControlName` ou `ngModel`. Deux colonnes :
 * heures, puis minutes par 5 (la minute déjà saisie reste proposée). Choisir les minutes referme la liste.
 *
 * `<label for="heure">…</label> <kp-champ-heure idChamp="heure" formControlName="heure" [effacable]="true" />`
 */
@Component({
  selector: 'kp-champ-heure',
  standalone: true,
  imports: [IconComponent],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ChampHeureComponent), multi: true }],
  template: `
    <button #declencheur type="button" class="kp-input declencheur" [id]="idChamp()" [disabled]="desactive()"
            aria-haspopup="dialog" [attr.aria-expanded]="ouvert()" (click)="basculer()" (keydown.arrowDown)="ouvrir(); $event.preventDefault()">
      <span class="valeur" [class.vide]="!valeur()">{{ valeur() ? libelle() : placeholder() }}</span>
      <kp-icon name="clock" [size]="18" [strokeWidth]="1.75" />
    </button>

    <div #panneau popover="auto" class="panneau" role="dialog" aria-label="Choisir une heure" (toggle)="surBascule($event)">
      <div class="colonnes">
        <div class="colonne">
          <span class="titre" id="kp-heures">Heure</span>
          <div class="liste" role="listbox" aria-labelledby="kp-heures">
            @for (h of heures; track h) {
              <button type="button" role="option" class="option" [class.choisi]="h === heure()" [attr.aria-selected]="h === heure()"
                      (click)="choisirHeure(h)">{{ h }}</button>
            }
          </div>
        </div>
        <div class="colonne">
          <span class="titre" id="kp-minutes">Minutes</span>
          <div class="liste" role="listbox" aria-labelledby="kp-minutes">
            @for (m of minutes(); track m) {
              <button type="button" role="option" class="option" [class.choisi]="m === minute()" [attr.aria-selected]="m === minute()"
                      (click)="choisirMinute(m)">{{ m }}</button>
            }
          </div>
        </div>
      </div>
      <div class="pied">
        <button type="button" class="lien" (click)="maintenant()">Maintenant</button>
        @if (effacable()) {
          <button type="button" class="lien" (click)="definir('', true)" [disabled]="!valeur()">Effacer</button>
        }
      </div>
    </div>
  `,
  styles: [STYLES_CHAMP_LISTE, `
    .panneau { width: 232px; }
    .colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .colonne { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .titre { padding: 0 8px; color: var(--kp-text-subtle); font-size: var(--kp-fs-mention); }
    .liste {
      display: flex; flex-direction: column; gap: 2px; height: 220px; overflow-y: auto; overscroll-behavior: contain;
      scrollbar-width: thin;
    }
    .option {
      flex: none; min-height: 36px; border: 0; border-radius: var(--kp-radius-pill); background: none;
      color: var(--kp-text); font-size: 14px; font-variant-numeric: tabular-nums; cursor: pointer;
    }
    .option:hover:not(.choisi) { background: var(--kp-bg); }
    .option.choisi { background: var(--kp-text); color: var(--kp-text-on-accent); font-weight: 500; }
  `],
})
export class ChampHeureComponent implements ControlValueAccessor {
  readonly idChamp = input<string | null>(null);
  readonly placeholder = input('Choisir une heure');
  readonly effacable = input(false);

  private readonly declencheur = viewChild.required<ElementRef<HTMLButtonElement>>('declencheur');
  private readonly panneau = viewChild.required<ElementRef<HTMLElement>>('panneau');

  readonly valeur = signal('');
  readonly desactive = signal(false);
  readonly ouvert = signal(false);

  readonly heures = Array.from({ length: 24 }, (_, i) => deux(i));
  readonly heure = computed(() => this.valeur().slice(0, 2));
  readonly minute = computed(() => this.valeur().slice(3, 5));
  /** Par 5 minutes, plus la minute déjà saisie si elle n'en fait pas partie. */
  readonly minutes = computed(() => {
    const liste = Array.from({ length: 12 }, (_, i) => deux(i * 5));
    const m = this.minute();
    return m && !liste.includes(m) ? [...liste, m].sort() : liste;
  });
  /** « 10 h 00 » */
  readonly libelle = computed(() => `${this.heure()} h ${this.minute()}`);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string | null | undefined): void {
    // Une heure « HH:mm:ss » (API) s'affiche et se renvoie en « HH:mm », comme le champ natif
    this.valeur.set((v ?? '').slice(0, 5));
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

  basculer(): void {
    if (this.ouvert()) this.fermer(); else this.ouvrir();
  }

  ouvrir(): void {
    if (this.desactive()) return;
    const panneau = this.panneau().nativeElement;
    ouvrirPopover(panneau);
    placerSous(panneau, this.declencheur().nativeElement);
    this.ouvert.set(true);
    setTimeout(() => {
      // L'heure choisie (ou 08) visible en haut de chaque colonne, et le focus dessus
      const listes = panneau.querySelectorAll<HTMLElement>('.liste');
      listes.forEach(l => {
        const cible = l.querySelector<HTMLElement>('.choisi') ?? (l === listes[0] ? l.children[8] as HTMLElement : null);
        if (cible) l.scrollTop = cible.offsetTop - l.offsetTop - 4;
      });
      (listes[0]?.querySelector<HTMLElement>('.choisi') ?? listes[0]?.children[8] as HTMLElement | undefined)?.focus();
    });
  }

  fermer(rendreFocus = true): void {
    fermerPopover(this.panneau().nativeElement);
    this.ouvert.set(false);
    this.onTouched();
    if (rendreFocus) this.declencheur().nativeElement.focus();
  }

  surBascule(e: Event): void {
    if ((e as ToggleEvent).newState === 'closed' && this.ouvert()) {
      this.ouvert.set(false);
      this.onTouched();
    }
  }

  choisirHeure(h: string): void {
    this.definir(`${h}:${this.minute() || '00'}`, false);
  }

  choisirMinute(m: string): void {
    this.definir(`${this.heure() || '08'}:${m}`, true);
  }

  maintenant(): void {
    const d = new Date();
    this.definir(`${deux(d.getHours())}:${deux(d.getMinutes())}`, true);
  }

  definir(v: string, fermer: boolean): void {
    this.valeur.set(v);
    this.onChange(v);
    if (fermer) this.fermer();
  }
}
