import { Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NavigationService, Onglet } from '../../core/navigation/navigation.service';
import { ChatStoreService } from '../../features/messagerie/services/chat-store.service';
import { ChatNotificationComponent } from '../../features/messagerie/components/chat-notification/chat-notification.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { BarreLateraleComponent } from './barre-laterale.component';
import { BarreHautComponent } from './barre-haut.component';
import { EnteteMobileComponent } from './entete-mobile.component';

/**
 * Mise en page de l'application, selon le profil de navigation (NavigationService.profil) :
 * - tablette et ordinateur : barre latérale (propriétaire) ou barre du haut (locataire, candidat, visiteur) ;
 * - téléphone : en-tête fixe et onglets du bas.
 * Masquées sur les écrans pleins (assistants, conversation ouverte sur téléphone) et tant que le profil
 * d'un compte qui vient de se connecter n'est pas connu.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ChatNotificationComponent,
    BarreLateraleComponent, BarreHautComponent, EnteteMobileComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  host: { '[class.avec-barre-laterale]': "barres() && nav.profil() === 'proprietaire'" },
})
export class AppShellComponent {
  protected readonly nav = inject(NavigationService);
  private readonly chat = inject(ChatStoreService);

  /** Barres de navigation affichées : hors écrans pleins, et une fois le profil du compte connu. */
  protected readonly barres = computed(() => !this.nav.pleinEcran() && this.nav.profilConnu());

  constructor() {
    const racine = document.documentElement;
    // Téléphone : en-tête et onglets du bas affichés, lus par les éléments collés en haut et en bas
    // (styles/_theme.scss : --kp-top-offset, --kp-bottom-offset)
    effect(() => {
      if (!this.barres()) {
        racine.removeAttribute('data-onglets');
      } else {
        racine.setAttribute('data-onglets', '');
      }
    });
    // Tablette et ordinateur : barre latérale ou barre du haut (--kp-top-offset)
    effect(() => {
      if (!this.barres()) {
        racine.removeAttribute('data-barre');
      } else {
        racine.setAttribute('data-barre', this.nav.profil() === 'proprietaire' ? 'laterale' : 'haut');
      }
    });
    inject(DestroyRef).onDestroy(() => {
      racine.removeAttribute('data-onglets');
      racine.removeAttribute('data-barre');
    });
  }

  protected compteur(onglet: Onglet): number {
    return onglet.compteur === 'messages' ? this.chat.unreadTotal() : 0;
  }
}
