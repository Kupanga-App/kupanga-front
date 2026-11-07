import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { NavigationService } from '../../core/navigation/navigation.service';
import { LogementContextService } from '../../core/services/logement-context.service';
import { ChatStoreService } from '../../features/messagerie/services/chat-store.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { ClocheComponent } from '../../shared/ui/cloche.component';
import { LogoComponent } from '../../shared/ui/logo.component';

/**
 * Barre latérale du propriétaire (tablette et ordinateur, maquettes `Nav-Proprio-*`) : carte fixe, logo, entrées
 * en pilule (seule la liste défile), puis « Voir les annonces » et la carte du compte avec la cloche.
 */
@Component({
  selector: 'kp-barre-laterale',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, AvatarComponent, ClocheComponent, LogoComponent],
  template: `
    <a routerLink="/accueil" class="logo" aria-label="Kupanga, accueil"><kp-logo [hauteur]="28" /></a>
    <nav class="entrees" aria-label="Navigation principale">
      @for (o of nav.onglets(); track o.lien) {
        <a [routerLink]="o.lien" routerLinkActive="actif" ariaCurrentWhenActive="page" class="entree"
           [class.actif]="nav.actifAussi(o)" [attr.aria-current]="nav.actifAussi(o) ? 'page' : null">
          <kp-icon [name]="o.icone" [size]="18" [strokeWidth]="1.75" />
          <span class="entree__libelle">{{ o.libelle }}</span>
          @if (o.compteur === 'messages' && nonLus(); as n) {
            <span class="entree__pastille" [attr.aria-label]="n + ' non lus'">{{ n > 99 ? '99+' : n }}</span>
          }
          @if (o.compteur === 'biens' && nombreBiens(); as n) {
            <span class="entree__nombre" [attr.aria-label]="n + ' bien' + (n > 1 ? 's' : '')">{{ n }}</span>
          }
        </a>
      }
    </nav>
    <div class="bas">
      <a routerLink="/explorer" routerLinkActive="actif" class="annonces">
        <kp-icon name="compass" [size]="18" [strokeWidth]="1.75" /> Voir les annonces
      </a>
      <div class="compte">
        <a routerLink="/compte" routerLinkActive="actif" ariaCurrentWhenActive="page" class="compte__lien">
          <kp-avatar [photo]="auth.currentUser()?.urlProfile" [nom]="nom()" [taille]="32" />
          <span class="compte__nom kp-ellipsis">{{ nom() }}</span>
        </a>
        <kp-cloche variante="carte" />
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex; flex-direction: column; gap: 4px;
      padding: 12px; box-sizing: border-box; overflow: hidden;
      background: var(--kp-surface); border-radius: var(--kp-radius-lg); box-shadow: var(--kp-elev-1);
    }
    .logo {
      display: flex; align-items: center; height: 40px; padding: 0 14px; margin-bottom: 8px;
      border-radius: var(--kp-radius-pill); text-decoration: none;
    }
    .entrees {
      flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
      display: flex; flex-direction: column; gap: 4px; margin: 0 -4px; padding: 0 4px;
    }
    .entree {
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
      height: 40px; padding: 0 14px; border-radius: var(--kp-radius-pill);
      color: var(--kp-text-muted); text-decoration: none;
      transition: background-color var(--kp-duree) var(--kp-ease), color var(--kp-duree) var(--kp-ease);
    }
    .entree:hover { background: var(--kp-bg); color: var(--kp-text); }
    .entree.actif, .entree.actif:hover { background: var(--kp-text); color: var(--kp-text-on-accent); }
    .entree__libelle { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .entree__pastille {
      display: grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; box-sizing: border-box;
      border-radius: var(--kp-radius-pill); background: var(--kp-accent-soft); color: var(--kp-state-success-text);
      font-size: var(--kp-fs-mention); font-weight: 500;
    }
    .entree.actif .entree__pastille { background: var(--kp-surface); color: var(--kp-text); }
    .entree__nombre { font-size: var(--kp-fs-mention); color: var(--kp-text-subtle); font-variant-numeric: tabular-nums; }
    .entree.actif .entree__nombre { color: inherit; opacity: 0.72; }
    .bas { flex: none; display: flex; flex-direction: column; gap: 8px; padding-top: 16px; }
    .annonces {
      display: flex; align-items: center; justify-content: center; gap: 8px; height: 40px;
      border-radius: var(--kp-radius-pill); box-shadow: inset 0 0 0 1px var(--kp-text);
      color: var(--kp-text); font-weight: 500; text-decoration: none;
      transition: background-color var(--kp-duree) var(--kp-ease);
    }
    .annonces:hover { background: var(--kp-bg); color: var(--kp-text); }
    .compte {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px 8px 8px;
      border-radius: var(--kp-radius-pill); background: var(--kp-bg);
    }
    .compte__lien {
      display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;
      border-radius: var(--kp-radius-pill); color: var(--kp-text); text-decoration: none;
      font-size: 14px; font-weight: 500;
    }
    .compte__lien:hover .compte__nom { text-decoration: underline; }
    /* Initiales en nuit plein, comme la maquette (le composant avatar les met sur surface en retrait) */
    .compte__lien ::ng-deep .initiales { background: var(--kp-text); color: var(--kp-text-on-accent); }
  `],
})
export class BarreLateraleComponent {
  protected readonly nav = inject(NavigationService);
  protected readonly auth = inject(AuthService);
  private readonly chat = inject(ChatStoreService);

  protected readonly nonLus = computed(() => this.chat.unreadTotal());
  protected readonly nombreBiens = inject(LogementContextService).nombreBiens;
  protected readonly nom = computed(() => {
    const u = this.auth.currentUser();
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '';
  });
}
