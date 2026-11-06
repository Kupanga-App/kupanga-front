import { Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { NavigationService, Onglet } from '../../core/navigation/navigation.service';
import { ChatStoreService } from '../../features/messagerie/services/chat-store.service';
import { AppNotificationService } from '../../features/notifications/services/app-notification.service';
import { ChatNotificationComponent } from '../../features/messagerie/components/chat-notification/chat-notification.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { BarreLateraleComponent } from './barre-laterale.component';
import { BarreHautComponent } from './barre-haut.component';

/**
 * Mise en page de l'application : barre d'onglets du bas (téléphone) ou barre latérale (tablette, ordinateur),
 * mêmes onglets selon le rôle. Masquées sur les écrans pleins (assistants, signature, conversation).
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ChatNotificationComponent, BarreLateraleComponent, BarreHautComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  host: { '[class.avec-barre-laterale]': "barres() && nav.profil() === 'proprietaire'" },
})
export class AppShellComponent {
  protected readonly nav = inject(NavigationService);
  protected readonly auth = inject(AuthService);
  private readonly chat = inject(ChatStoreService);
  protected readonly notifications = inject(AppNotificationService);

  protected readonly connecte = computed(() => !!this.auth.currentUser());
  /** Barres de navigation affichées : hors écrans pleins, et une fois le profil du compte connu. */
  protected readonly barres = computed(() => !this.nav.pleinEcran() && this.nav.profilConnu());

  constructor() {
    // Hauteur de la barre d'onglets lue par les éléments collés en bas (styles/_theme.scss : --kp-bottom-offset)
    const racine = document.documentElement;
    effect(() => {
      if (!this.barres()) {
        racine.removeAttribute('data-onglets');
      } else {
        racine.setAttribute('data-onglets', '');
      }
    });
    // Barre affichée sur tablette et ordinateur, lue par les en-têtes collés en haut (--kp-top-offset)
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
