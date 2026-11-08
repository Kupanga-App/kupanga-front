import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, PLATFORM_ID, ViewEncapsulation, afterNextRender, inject,
  input, signal, viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { DATE_MISE_A_JOUR_LEGALE, LIENS_LEGAUX } from '../../core/legal/liens-legaux';
import { LogoComponent } from '../../shared/ui/logo.component';
import { OngletPage, OngletsComponent } from '../../shared/ui/segmented.component';

/** Point de l'encadré « L'essentiel » en tête de page. */
export interface PointEssentiel {
  icone: string;
  texte: string;
  /** Point à surveiller (pastille ambre). */
  attention?: boolean;
}

interface EntreeSommaire {
  id: string;
  numero: string;
  titre: string;
}

/**
 * Mise en page commune des pages légales (publiques, sans compte) : barre collante en pilule (retour, logo, choix
 * du document), sommaire collant sur ordinateur (repliable ailleurs), encadré « L'essentiel », colonne de lecture.
 * Le texte est projeté en `<section class="kp-legal__section" id="…">` avec un `<h2>` dont le numéro est dans
 * `.kp-legal__num` : le sommaire est construit à partir de ces sections.
 * Styles non encapsulés mais limités à `.kp-legal`.
 */
@Component({
  selector: 'kp-page-legale',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, LogoComponent, OngletsComponent],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './page-legale.component.scss',
  template: `
    <div class="kp-legal">
      <header class="kp-legal__barre">
        <div class="kp-legal__pilule">
          <div class="kp-legal__marque">
            <button type="button" class="kp-legal__retour" (click)="retour()" aria-label="Retour">
              <kp-icon name="chevron-left" [size]="22" [strokeWidth]="1.5" />
            </button>
            <a routerLink="/" class="kp-legal__logo" aria-label="Kupanga, accueil">
              <kp-logo [hauteur]="28" aria-hidden="true" />
            </a>
          </div>
          <kp-onglets class="kp-legal__documents" libelle="Documents légaux" [onglets]="documents" />
        </div>
      </header>

      <div class="kp-legal__conteneur">
        @if (sommaire().length) {
          <nav class="kp-legal__sommaire" aria-label="Sommaire">
            <p class="kp-legal__sommaire-titre">Sommaire</p>
            <ol>
              @for (e of sommaire(); track e.id) {
                <li>
                  <a [href]="lien(e.id)" [class.actif]="actif() === e.id" [attr.aria-current]="actif() === e.id ? 'location' : null"
                     (click)="aller($event, e.id)">
                    <span class="kp-legal__num">{{ e.numero }}</span> {{ e.titre }}
                  </a>
                </li>
              }
            </ol>
          </nav>
        }

        <main class="kp-legal__lecture">
          <h1 class="kp-legal__titre">{{ titre() }}</h1>
          <p class="kp-legal__date">Dernière mise à jour : {{ date }}</p>

          @if (sommaire().length) {
            <details class="kp-legal__sommaire-replie" #replie>
              <summary>
                Sommaire
                <kp-icon name="chevron-down" [size]="18" [strokeWidth]="1.5" />
              </summary>
              <ol>
                @for (e of sommaire(); track e.id) {
                  <li>
                    <a [href]="lien(e.id)" (click)="aller($event, e.id)">
                      <span class="kp-legal__num">{{ e.numero }}</span> {{ e.titre }}
                    </a>
                  </li>
                }
              </ol>
            </details>
          }

          @if (essentiel().length) {
            <section class="kp-legal__essentiel" aria-labelledby="kp-legal-essentiel">
              <h2 id="kp-legal-essentiel">L'essentiel</h2>
              <ul>
                @for (p of essentiel(); track p.texte) {
                  <li>
                    <span class="kp-legal__pastille" [class.kp-legal__pastille--attention]="p.attention">
                      <kp-icon [name]="p.icone" [size]="18" [strokeWidth]="1.5" />
                    </span>
                    {{ p.texte }}
                  </li>
                }
              </ul>
            </section>
          }

          <div class="kp-legal__texte" #texte><ng-content /></div>
        </main>
      </div>

      <footer class="kp-legal__pied">
        <nav aria-label="Informations légales">
          <a [routerLink]="liens.conditions" routerLinkActive="actif" ariaCurrentWhenActive="page">Conditions d'utilisation</a>
          <a [routerLink]="liens.confidentialite" routerLinkActive="actif" ariaCurrentWhenActive="page">Confidentialité</a>
        </nav>
      </footer>
    </div>
  `,
})
export class PageLegaleComponent {
  private readonly router = inject(Router);
  readonly titre = input.required<string>();
  readonly essentiel = input<PointEssentiel[]>([]);
  protected readonly liens = LIENS_LEGAUX;
  protected readonly date = DATE_MISE_A_JOUR_LEGALE;
  protected readonly documents: OngletPage[] = [
    { libelle: 'Conditions d’utilisation', lien: LIENS_LEGAUX.conditions },
    { libelle: 'Confidentialité', lien: LIENS_LEGAUX.confidentialite },
  ];

  readonly sommaire = signal<EntreeSommaire[]>([]);
  /** Section visible à l'écran, surlignée dans le sommaire. */
  readonly actif = signal<string | null>(null);

  private readonly texte = viewChild.required<ElementRef<HTMLElement>>('texte');
  private readonly replie = viewChild<ElementRef<HTMLDetailsElement>>('replie');

  constructor() {
    const navigateur = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const sections = Array.from(this.texte().nativeElement.querySelectorAll<HTMLElement>('section.kp-legal__section[id]'));
      this.sommaire.set(sections.map(s => {
        const h2 = s.querySelector('h2');
        const numero = h2?.querySelector('.kp-legal__num')?.textContent?.trim() ?? '';
        const titre = (h2?.textContent ?? '').replace(numero, '').trim();
        return { id: s.id, numero, titre };
      }));
      this.actif.set(sections[0]?.id ?? null);

      if (!navigateur || typeof IntersectionObserver === 'undefined') return;
      // Bande de lecture : sous la barre collante, dans le premier tiers de l'écran
      const visibles = new Set<string>();
      const observateur = new IntersectionObserver(entrees => {
        for (const e of entrees) {
          if (e.isIntersecting) visibles.add(e.target.id);
          else visibles.delete(e.target.id);
        }
        const premiere = sections.find(s => visibles.has(s.id));
        if (premiere) this.actif.set(premiere.id);
      }, { rootMargin: '-96px 0px -60% 0px' });
      sections.forEach(s => observateur.observe(s));
      destroyRef.onDestroy(() => observateur.disconnect());
    });
  }

  /** Adresse complète de l'ancre (un `href="#…"` seul renverrait à la racine à cause de `<base href="/">`). */
  protected lien(id: string): string {
    return `${this.router.url.split('#')[0]}#${id}`;
  }

  protected aller(event: MouseEvent, id: string): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const cible = document.getElementById(id);
    if (!cible) return;
    const doux = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    cible.scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: 'start' });
    // Le titre de la section reçoit le focus pour la navigation au clavier et les lecteurs d'écran
    const titre = cible.querySelector<HTMLElement>('h2');
    titre?.setAttribute('tabindex', '-1');
    titre?.focus({ preventScroll: true });
    this.actif.set(id);
    history.replaceState(history.state, '', this.lien(id));
    const replie = this.replie()?.nativeElement;
    if (replie) replie.open = false;
  }

  /** Page précédente si elle existe (navigation dans l'application), sinon l'accueil (onglet ouvert depuis un lien). */
  retour(): void {
    if (this.router.lastSuccessfulNavigation?.previousNavigation) history.back();
    else this.router.navigateByUrl('/');
  }
}
