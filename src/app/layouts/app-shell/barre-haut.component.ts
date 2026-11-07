import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { NavigationService } from '../../core/navigation/navigation.service';
import { ChatStoreService } from '../../features/messagerie/services/chat-store.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { ClocheComponent } from '../../shared/ui/cloche.component';
import { LogoComponent } from '../../shared/ui/logo.component';

/**
 * Barre du haut (tablette et ordinateur) du locataire et du candidat (maquettes `Mon-Logement`, `Nav-Candidat`) :
 * pilule blanche collante, logo à gauche, entrées au centre, cloche puis menu du compte à droite.
 * Visiteur : barre publique (Annonces, Se connecter, Créer un compte), restylée en phase 5.
 */
@Component({
  selector: 'kp-barre-haut',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, AvatarComponent, ClocheComponent, LogoComponent],
  host: {
    '(document:click)': 'clicDocument($event)',
    '(document:keydown.escape)': 'fermer(true)',
  },
  template: `
    <div class="pilule">
      <a [routerLink]="connecte() ? '/accueil' : '/'" class="logo" aria-label="Kupanga, accueil"><kp-logo [hauteur]="28" /></a>

      @if (connecte()) {
        <nav class="entrees" aria-label="Navigation principale">
          @for (o of nav.onglets(); track o.lien) {
            <a [routerLink]="o.lien" routerLinkActive="actif" ariaCurrentWhenActive="page" class="entree"
               [class.actif]="nav.actifAussi(o)" [attr.aria-current]="nav.actifAussi(o) ? 'page' : null">
              {{ o.libelle }}
              @if (o.compteur === 'messages' && nonLus(); as n) {
                <span class="entree__nombre" [attr.aria-label]="n + ' non lus'">{{ n > 99 ? '99+' : n }}</span>
              }
            </a>
          }
        </nav>
        <div class="droite">
          <kp-cloche variante="barre" />
          <div class="compte">
            <button type="button" class="compte__bouton" aria-haspopup="menu" [attr.aria-expanded]="menuOuvert()"
                    aria-controls="kp-menu-compte" (click)="basculer()" #bouton>
              <kp-avatar [photo]="auth.currentUser()?.urlProfile" [nom]="nomComplet()" [taille]="32" />
              <span class="compte__nom">{{ nomCourt() }}</span>
              <kp-icon name="chevron-down" [size]="16" [strokeWidth]="1.75" />
            </button>
            @if (menuOuvert()) {
              <ul class="menu" id="kp-menu-compte" role="menu" aria-label="Compte">
                <li role="none"><a role="menuitem" routerLink="/compte" class="menu__item"><kp-icon name="user" [size]="18" /> Compte</a></li>
                @if (nav.aDesDocuments()) {
                  <li role="none"><a role="menuitem" routerLink="/documents" class="menu__item"><kp-icon name="file-text" [size]="18" /> Documents</a></li>
                }
                <li role="none"><a role="menuitem" routerLink="/messages" class="menu__item"><kp-icon name="message-circle" [size]="18" /> Messages</a></li>
                <li role="none" class="menu__separateur"></li>
                <li role="none"><button type="button" role="menuitem" class="menu__item" (click)="deconnecter()"><kp-icon name="log-out" [size]="18" /> Déconnexion</button></li>
              </ul>
            }
          </div>
        </div>
      } @else {
        <nav class="entrees" aria-label="Navigation principale">
          <a routerLink="/explorer" routerLinkActive="actif" ariaCurrentWhenActive="page" class="entree"
             [class.actif]="nav.surAdresse('/annonces')">Annonces</a>
        </nav>
        <div class="droite">
          <a routerLink="/auth/login" class="kp-btn kp-btn--ghost">Se connecter</a>
          <a routerLink="/auth/register" class="kp-btn kp-btn--primary">Créer un compte</a>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block; position: sticky; top: 0; z-index: 50;
      padding: calc(var(--kp-shell-gap, 12px) + var(--kp-safe-top)) clamp(8px, 1.6vw, 24px) 0;
      background: linear-gradient(var(--kp-bg) 70%, transparent);
    }
    .pilule {
      display: flex; align-items: center; gap: 24px;
      max-width: 1600px; height: 56px; margin: 0 auto; padding: 0 8px 0 24px; box-sizing: border-box;
      background: var(--kp-surface); border-radius: var(--kp-radius-pill); box-shadow: var(--kp-elev-1);
    }
    .logo { display: flex; align-items: center; border-radius: var(--kp-radius-pill); }
    .entrees { display: flex; gap: 4px; margin: 0 auto; min-width: 0; }
    .entree {
      display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; white-space: nowrap;
      border-radius: var(--kp-radius-pill); color: var(--kp-text-muted); text-decoration: none;
      transition: background-color var(--kp-duree) var(--kp-ease), color var(--kp-duree) var(--kp-ease);
    }
    .entree:hover { background: var(--kp-bg); color: var(--kp-text); }
    .entree.actif, .entree.actif:hover { background: var(--kp-text); color: var(--kp-text-on-accent); }
    .entree__nombre { font-size: var(--kp-fs-mention); opacity: 0.75; }
    .droite { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .compte { position: relative; }
    .compte__bouton {
      display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 12px 0 6px;
      border: 0; border-radius: var(--kp-radius-pill); background: var(--kp-text); color: var(--kp-text-on-accent);
      font: inherit; font-size: 14px; font-weight: 500; cursor: pointer;
    }
    .compte__bouton ::ng-deep .initiales { background: var(--kp-surface); color: var(--kp-text); }
    .compte__nom { white-space: nowrap; }
    .menu {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 60;
      min-width: 220px; margin: 0; padding: 6px; list-style: none;
      background: var(--kp-surface); border-radius: var(--kp-radius-md); box-shadow: var(--kp-elev-1);
    }
    .menu__item {
      display: flex; align-items: center; gap: 10px; width: 100%; height: 40px; padding: 0 12px; box-sizing: border-box;
      border: 0; border-radius: var(--kp-radius-sm); background: transparent; color: var(--kp-text);
      font: inherit; text-align: left; text-decoration: none; cursor: pointer;
    }
    .menu__item:hover { background: var(--kp-bg); color: var(--kp-text); }
    .menu__separateur { height: 1px; margin: 6px 4px; background: var(--kp-border); }
  `],
})
export class BarreHautComponent {
  protected readonly nav = inject(NavigationService);
  protected readonly auth = inject(AuthService);
  private readonly chat = inject(ChatStoreService);
  private readonly hote: ElementRef<HTMLElement> = inject(ElementRef);

  protected readonly menuOuvert = signal(false);
  protected readonly connecte = computed(() => !!this.auth.currentUser());
  protected readonly nonLus = computed(() => this.chat.unreadTotal());
  protected readonly nomComplet = computed(() => {
    const u = this.auth.currentUser();
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '';
  });
  /** « Inès M. » */
  protected readonly nomCourt = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return '';
    const initiale = u.lastName?.trim()?.[0];
    return initiale ? `${u.firstName} ${initiale.toUpperCase()}.` : u.firstName;
  });

  constructor() {
    inject(Router).events.pipe(filter(e => e instanceof NavigationStart), takeUntilDestroyed())
      .subscribe(() => this.menuOuvert.set(false));
  }

  protected basculer(): void {
    this.menuOuvert.update(o => !o);
  }

  protected fermer(rendreFocus = false): void {
    if (!this.menuOuvert()) return;
    this.menuOuvert.set(false);
    if (rendreFocus) this.hote.nativeElement.querySelector<HTMLElement>('.compte__bouton')?.focus();
  }

  protected clicDocument(e: MouseEvent): void {
    const compte = this.hote.nativeElement.querySelector('.compte');
    if (compte && !compte.contains(e.target as Node)) this.fermer();
  }

  /** Même déconnexion que la page Compte. */
  protected deconnecter(): void {
    this.menuOuvert.set(false);
    this.auth.logout().subscribe({ error: () => undefined });
  }
}
