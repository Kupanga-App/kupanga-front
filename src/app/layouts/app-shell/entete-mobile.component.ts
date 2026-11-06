import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { ClocheComponent } from '../../shared/ui/cloche.component';
import { LogoComponent } from '../../shared/ui/logo.component';

/**
 * En-tête fixe du téléphone (maquette `Nav-Mobile`) : logo, cloche et avatar vers le compte.
 * Visiteur : logo et « Créer un compte ».
 */
@Component({
  selector: 'kp-entete-mobile',
  standalone: true,
  imports: [RouterLink, AvatarComponent, ClocheComponent, LogoComponent],
  template: `
    <a [routerLink]="connecte() ? '/accueil' : '/'" class="logo" aria-label="Kupanga, accueil"><kp-logo [hauteur]="26" /></a>
    @if (connecte()) {
      <kp-cloche variante="entete" />
      <a routerLink="/compte" class="avatar" aria-label="Compte">
        <kp-avatar [photo]="auth.currentUser()?.urlProfile" [nom]="nom()" [taille]="44" />
      </a>
    } @else {
      <a routerLink="/auth/register" class="kp-btn kp-btn--primary kp-btn--sm">Créer un compte</a>
    }
  `,
  styles: [`
    :host {
      display: flex; align-items: center; gap: 8px;
      padding: calc(8px + var(--kp-safe-top)) calc(16px + var(--kp-safe-right)) 8px calc(16px + var(--kp-safe-left));
      background: linear-gradient(var(--kp-bg) 80%, color-mix(in srgb, var(--kp-bg) 0%, transparent));
    }
    .logo { display: flex; align-items: center; flex: 1; min-width: 0; min-height: 44px; }
    .avatar { display: inline-flex; border-radius: 50%; }
    .avatar ::ng-deep .initiales { background: var(--kp-text); color: var(--kp-text-on-accent); font-size: 13px !important; }
  `],
})
export class EnteteMobileComponent {
  protected readonly auth = inject(AuthService);
  protected readonly connecte = computed(() => !!this.auth.currentUser());
  protected readonly nom = computed(() => {
    const u = this.auth.currentUser();
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '';
  });
}
