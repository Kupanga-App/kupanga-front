import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { IconComponent } from '../components/icon/icon.component';

/**
 * Galerie photo : balayage horizontal avec compteur « 3 / 12 », plein écran au toucher.
 * Photos chargées à la demande (seule la première l'est tout de suite).
 */
@Component({
  selector: 'kp-galerie',
  standalone: true,
  imports: [A11yModule, IconComponent],
  template: `
    @if (photos().length) {
      <div class="galerie">
        <div class="defilement" #defilement (scroll)="suivreDefilement(defilement)" tabindex="0" aria-label="Photos du bien">
          @for (p of photos(); track $index) {
            <button type="button" class="diapo" (click)="ouvrir($index)" [attr.aria-label]="'Agrandir la photo ' + ($index + 1)">
              <img [src]="p" alt="" [attr.loading]="$index === 0 ? 'eager' : 'lazy'" decoding="async" />
            </button>
          }
        </div>
        @if (photos().length > 1) {
          <span class="compteur" aria-live="polite">{{ courante() + 1 }} / {{ photos().length }}</span>
          <button type="button" class="fleche fleche--g" (click)="aller(courante() - 1)" [disabled]="courante() === 0" aria-label="Photo précédente">
            <kp-icon name="chevron-left" />
          </button>
          <button type="button" class="fleche fleche--d" (click)="aller(courante() + 1)" [disabled]="courante() === photos().length - 1" aria-label="Photo suivante">
            <kp-icon name="chevron-right" />
          </button>
        }
      </div>
    } @else {
      <div class="vide"><kp-icon name="image" [size]="32" /><span>Pas de photo</span></div>
    }

    @if (pleinEcran()) {
      <div class="plein" role="dialog" aria-modal="true" aria-label="Photos en plein écran" cdkTrapFocus [cdkTrapFocusAutoCapture]="true"
           (keydown.escape)="pleinEcran.set(false)">
        <div class="plein__haut">
          <span>{{ courantePlein() + 1 }} / {{ photos().length }}</span>
          <button type="button" class="kp-icon-btn fermer" (click)="pleinEcran.set(false)" aria-label="Fermer"><kp-icon name="x" [size]="24" /></button>
        </div>
        <div class="plein__defilement" #pleinDefilement (scroll)="suivrePlein(pleinDefilement)">
          @for (p of photos(); track $index) {
            <div class="plein__diapo"><img [src]="p" alt="" loading="lazy" /></div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .galerie { position: relative; border-radius: var(--kp-radius); overflow: hidden; background: var(--kp-surface-2); }
    .defilement { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; overscroll-behavior-x: contain; }
    .defilement::-webkit-scrollbar { display: none; }
    .diapo { flex: 0 0 100%; aspect-ratio: 4 / 3; padding: 0; border: 0; background: none; scroll-snap-align: center; }
    .diapo img { width: 100%; height: 100%; object-fit: cover; }
    @media (min-width: 768px) { .diapo { aspect-ratio: 16 / 9; } }
    .compteur {
      position: absolute; right: 12px; bottom: 12px; padding: 4px 10px; border-radius: var(--kp-radius-full);
      background: rgba(16, 33, 43, 0.75); color: #fff; font-size: var(--kp-fs-xs); font-weight: 600;
    }
    .fleche {
      position: absolute; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center;
      width: 40px; height: 40px; border: 0; border-radius: 50%; background: rgba(255, 255, 255, 0.92); color: #10212b;
    }
    .fleche:disabled { opacity: 0; pointer-events: none; }
    .fleche--g { left: 12px; }
    .fleche--d { right: 12px; }
    @media (hover: hover) and (pointer: fine) { .fleche { display: inline-flex; } }
    .vide {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; aspect-ratio: 16 / 9;
      border-radius: var(--kp-radius); background: var(--kp-surface-2); color: var(--kp-text-3);
    }
    .plein { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; background: #000; color: #fff; }
    .plein__haut {
      display: flex; align-items: center; justify-content: space-between;
      padding: calc(8px + var(--kp-safe-top)) 8px 8px 20px;
    }
    .fermer { color: #fff; }
    .plein__defilement { flex: 1; display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
    .plein__defilement::-webkit-scrollbar { display: none; }
    .plein__diapo { flex: 0 0 100%; display: flex; align-items: center; justify-content: center; scroll-snap-align: center; padding-bottom: var(--kp-safe-bottom); }
    .plein__diapo img { max-width: 100%; max-height: 100%; object-fit: contain; }
  `],
})
export class GalerieComponent {
  readonly photos = input.required<string[]>();
  readonly courante = signal(0);
  readonly courantePlein = signal(0);
  readonly pleinEcran = signal(false);

  private readonly defilement = viewChild<ElementRef<HTMLElement>>('defilement');
  private readonly pleinDefilement = viewChild<ElementRef<HTMLElement>>('pleinDefilement');

  readonly nombre = computed(() => this.photos().length);

  suivreDefilement(el: HTMLElement): void {
    this.courante.set(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  }

  suivrePlein(el: HTMLElement): void {
    this.courantePlein.set(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  }

  aller(i: number): void {
    const el = this.defilement()?.nativeElement;
    if (!el) return;
    const cible = Math.max(0, Math.min(this.photos().length - 1, i));
    el.scrollTo({ left: cible * el.clientWidth, behavior: 'smooth' });
  }

  ouvrir(i: number): void {
    this.courantePlein.set(i);
    this.pleinEcran.set(true);
    setTimeout(() => {
      const el = this.pleinDefilement()?.nativeElement;
      if (el) el.scrollLeft = i * el.clientWidth;
    });
  }
}
