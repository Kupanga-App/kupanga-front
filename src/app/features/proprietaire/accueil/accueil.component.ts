import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { DonneesProprietaireService } from '../donnees-proprietaire.service';
import { ChatStoreService } from '../../messagerie/services/chat-store.service';
import { BienDTO } from '../../biens/models/bien.model';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { VideComponent } from '../../../shared/ui/vide.component';
import { CarteBienComponent } from '../../../shared/ui/carte-bien.component';
import { TirerPourActualiserDirective } from '../../../shared/ui/tirer-pour-actualiser.directive';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DemandesRecuesComponent } from '../../locataire/demandes-recues.component';
import { DonneesAccueil, Tache, calculerTaches } from './taches';

/**
 * Accueil, le même pour tous les comptes (lot 3, plus de rôle) : demandes et réservations, logements loués, puis
 * ce qu'il y a à faire sur les biens possédés et ces biens (AUDIT.md §8.4). Un même compte peut louer et
 * mettre en location.
 */
@Component({
  selector: 'kp-accueil',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, VideComponent, CarteBienComponent, TirerPourActualiserDirective, IconComponent,
    DemandesRecuesComponent],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.scss',
})
export class AccueilComponent implements OnInit {
  private auth = inject(AuthService);
  private donneesProprietaire = inject(DonneesProprietaireService);
  private chat = inject(ChatStoreService);

  readonly chargement = signal(true);
  readonly erreur = signal(false);
  readonly biens = signal<BienDTO[]>([]);
  /** Logements que le compte loue. */
  readonly logements = signal<BienDTO[]>([]);
  private readonly donnees = signal<Omit<DonneesAccueil, 'messagesNonLus'> | null>(null);
  /** Recalculées quand un message arrive (compteur de non-lus en temps réel). */
  readonly taches = computed<Tache[]>(() => {
    const d = this.donnees();
    return d ? calculerTaches({ ...d, messagesNonLus: this.chat.unreadTotal() }) : [];
  });

  readonly prenom = computed(() => this.auth.currentUser()?.firstName ?? '');
  readonly biensActifs = computed(() => this.biens().filter(b => !b.archive));
  readonly apercu = computed(() => this.biensActifs().slice(0, 4));
  readonly nbLoues = computed(() => this.biensActifs().filter(b => !!b.locataire).length);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(false);
    this.chat.loadUnreadCount();
    this.donneesProprietaire.charger().subscribe({
      next: donnees => {
        this.biens.set(donnees.biens);
        this.logements.set(donnees.logements);
        this.donnees.set(donnees);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set(true);
      },
    });
  }
}
