import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';

/**
 * Logo Kupanga (pictogramme + nom) : fichier SVG clair ou sombre selon le thème effectif.
 * Le nom « kupanga » n'est jamais tapé en texte dans un en-tête : c'est ce composant.
 *
 * `<kp-logo [hauteur]="28" />` · `forme="icone"` pour le pictogramme seul.
 */
@Component({
  selector: 'kp-logo',
  standalone: true,
  template: `
    <img [src]="source()" alt="" [style.height.px]="hauteur()" draggable="false" />
  `,
  host: { role: 'img', 'aria-label': 'Kupanga' },
  styles: [`
    :host { display: inline-flex; align-items: center; flex-shrink: 0; line-height: 0; }
    img { display: block; width: auto; max-width: none; user-select: none; }
  `],
})
export class LogoComponent {
  /** Hauteur en pixels : 26 à 28 dans les barres. */
  readonly hauteur = input(28);
  readonly forme = input<'logo' | 'icone'>('logo');

  private readonly theme = inject(ThemeService);
  private readonly systemeSombre = signal(false);

  /** Thème réellement affiché : choix du compte, sinon réglage de l'appareil. */
  readonly sombre = computed(() => {
    const choix = this.theme.choix();
    return choix === 'sombre' || (choix === 'systeme' && this.systemeSombre());
  });

  readonly source = computed(
    () => `brand/kupanga-${this.forme()}-${this.sombre() ? 'sombre' : 'clair'}.svg`,
  );

  constructor() {
    const requete = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    if (requete) {
      this.systemeSombre.set(requete.matches);
      const suivre = (e: MediaQueryListEvent) => this.systemeSombre.set(e.matches);
      requete.addEventListener('change', suivre);
      inject(DestroyRef).onDestroy(() => requete.removeEventListener('change', suivre));
    }
  }
}
