import {
  Component, DestroyRef, ElementRef, PLATFORM_ID, ViewEncapsulation, afterNextRender, inject, input, viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LogoComponent } from '../../../shared/ui/logo.component';
import { LIENS_LEGAUX } from '../../legal/liens-legaux';
import { AuthEtapesComponent } from './auth-etapes.component';
import { AuthIllustrationComponent } from './auth-illustration.component';
import { PANNEAU_CONNEXION, PanneauAuth } from './panneaux';

/**
 * Coquille des écrans d'authentification.
 *
 * - `forme="colonnes"` (connexion, inscription, mot de passe) : ordinateur (≥ 1100 px) en deux colonnes, formulaire
 *   à gauche et photo à droite avec une carte (`panneau`) ; tablette et téléphone : formulaire seul. Sur téléphone,
 *   en-tête de 56 px, contenu défilant et barre d'actions (`[actions]`) collée en bas, qui suit la zone visible
 *   au-dessus du clavier.
 * - `forme="carte"` (confirmation d'e-mail, lien expiré) : carte centrée seule, actions dans la carte.
 *
 * Emplacements : contenu par défaut, `[actions]` (boutons, liés au formulaire par l'attribut `form`),
 * `[suite]` (séparateur « ou », Google, mention), `[pied]` (« Pas encore de compte ? »).
 */
@Component({
  selector: 'kp-auth-shell',
  standalone: true,
  imports: [RouterLink, IconComponent, LogoComponent, AuthEtapesComponent, AuthIllustrationComponent],
  encapsulation: ViewEncapsulation.None,
  styleUrl: './auth-shell.component.scss',
  host: { '[class.kp-auth--colonnes]': "forme() === 'colonnes'", '[class.kp-auth--carte]': "forme() === 'carte'" },
  template: `
    <div class="kp-auth__colonne">
      <header class="kp-auth__entete">
        @if (retour(); as url) {
          <a class="kp-auth__retour" [routerLink]="url" aria-label="Retour">
            <kp-icon name="chevron-left" [size]="22" [strokeWidth]="1.5" />
          </a>
        }
        <a routerLink="/explorer" class="kp-auth__logo" [class.kp-auth__logo--avec-etapes]="progression()"
           aria-label="Kupanga, voir les annonces">
          <kp-logo [hauteur]="28" aria-hidden="true" />
        </a>
        @if (progression(); as n) {
          <kp-auth-etapes class="kp-auth__etapes-entete" [etape]="n" forme="barre" />
        }
      </header>

      <div class="kp-auth__defile">
        <main class="kp-auth__corps" aria-labelledby="kp-auth-titre">
          @if (illustration(); as sujet) {
            <kp-auth-illustration class="kp-auth__illustration" [sujet]="sujet" />
          }
          @if (progression(); as n) {
            <kp-auth-etapes class="kp-auth__etapes" [etape]="n" />
          }
          <h1 class="kp-auth__titre" id="kp-auth-titre">{{ titre() }}</h1>
          @if (sousTitre()) {
            <p class="kp-auth__sous-titre">{{ sousTitre() }}</p>
          }
          <div class="kp-auth__contenu"><ng-content /></div>
          <div class="kp-auth__actions" #actions><ng-content select="[actions]" /></div>
          <ng-content select="[suite]" />
          <div class="kp-auth__pied"><ng-content select="[pied]" /></div>
        </main>
        <nav class="kp-auth__legal" aria-label="Informations légales">
          <a [routerLink]="liens.confidentialite" target="_blank">Confidentialité</a>
          <a [routerLink]="liens.conditions" target="_blank">Conditions d'utilisation</a>
        </nav>
      </div>
    </div>

    @if (forme() === 'colonnes' && panneau(); as p) {
      <aside class="kp-auth__panneau" aria-label="Kupanga en bref">
        <img class="kp-auth__photo" [src]="photo()" alt="" decoding="async" />
        @for (contenu of [p]; track contenu.titre) {
          <div class="kp-auth__carte-panneau">
            <p class="kp-auth__phrase">{{ contenu.titre }}</p>
            <ul class="kp-auth__promesses">
              @for (promesse of contenu.promesses; track promesse.texte) {
                <li>
                  <span class="kp-auth__pastille"><kp-icon [name]="promesse.icone" [size]="18" [strokeWidth]="1.5" /></span>
                  {{ promesse.texte }}
                </li>
              }
            </ul>
          </div>
        }
      </aside>
    }
  `,
})
export class AuthShellComponent {
  readonly titre = input.required<string>();
  readonly sousTitre = input<string | null>(null);
  /** Adresse du bouton retour rond ; aucun bouton si `null`. */
  readonly retour = input<string | null>(null);
  readonly forme = input<'colonnes' | 'carte'>('colonnes');
  readonly panneau = input<PanneauAuth | null>(PANNEAU_CONNEXION);
  readonly photo = input('landing/france.jpg');
  /** Étape en cours (1 à 3) : « Étape N sur 3 » au-dessus du titre, barre dans l'en-tête du téléphone. */
  readonly progression = input<number | null>(null);
  readonly illustration = input<'enveloppe' | 'maison' | 'lien' | null>(null);

  protected readonly liens = LIENS_LEGAUX;

  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly actions = viewChild.required<ElementRef<HTMLElement>>('actions');

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const hote = this.hote.nativeElement;

      // Téléphone : la coquille épouse la zone visible, la barre d'actions reste au-dessus du clavier
      const vv = window.visualViewport;
      if (vv) {
        const suivre = () => {
          hote.style.setProperty('--kp-auth-hauteur', `${vv.height}px`);
          hote.style.setProperty('--kp-auth-haut', `${vv.offsetTop}px`);
        };
        suivre();
        vv.addEventListener('resize', suivre);
        vv.addEventListener('scroll', suivre);
        destroyRef.onDestroy(() => {
          vv.removeEventListener('resize', suivre);
          vv.removeEventListener('scroll', suivre);
        });
      }

      // Réserve en bas du contenu défilant la hauteur réelle de la barre d'actions
      if (typeof ResizeObserver !== 'undefined') {
        const barre = this.actions().nativeElement;
        const observateur = new ResizeObserver(() => hote.style.setProperty('--kp-auth-barre', `${barre.offsetHeight}px`));
        observateur.observe(barre);
        destroyRef.onDestroy(() => observateur.disconnect());
      }
    });
  }
}
