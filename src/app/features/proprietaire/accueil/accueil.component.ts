import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LogementContextService } from '../../../core/services/logement-context.service';
import { DonneesProprietaire, DonneesProprietaireService } from '../donnees-proprietaire.service';
import { ChatStoreService } from '../../messagerie/services/chat-store.service';
import { ChatService } from '../../messagerie/services/chat.service';
import { ConversationDTO } from '../../messagerie/models/chat.models';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { nomCourt } from '../../locataire/nom-court';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { BienDTO, locataireDuBail, vignette } from '../../biens/models/bien.model';
import { MontantPipe } from '../../../core/money/montant';
import { DateLonguePipe, heureMessage } from '../../../shared/format';
import { VideComponent } from '../../../shared/ui/vide.component';
import { CarteBienComponent } from '../../../shared/ui/carte-bien.component';
import { FriseComponent } from '../../../shared/ui/frise.component';
import { OptionSegment, SegmentedComponent } from '../../../shared/ui/segmented.component';
import { TirerPourActualiserDirective } from '../../../shared/ui/tirer-pour-actualiser.directive';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DemandesRecuesComponent } from '../../locataire/demandes-recues.component';
import { DonneesAccueil, Tache, calculerTaches } from './taches';
import { calculerChiffres } from './chiffres-accueil';
import { EtapesLocation, calculerEtapesLocation } from '../etapes-location';

type Filtre = 'tous' | 'loues' | 'vacants';

/** État d'un bien dans la liste (point + texte). */
interface EtatBien {
  libelle: string;
  ton: 'ok' | 'attention' | 'neutre';
}

/**
 * Accueil, le même pour tous les comptes (lot 3, plus de rôle). Propriétaire (`Nav-Proprio-Tableau`) : chiffres du
 * mois, bien dont la location avance, autres tâches, liste des biens filtrable. Candidat (`Nav-Candidat`) : demande
 * à traiter en tête, conversations en cours, raccourcis. Un compte qui loue garde ses demandes, réservations et
 * logements loués ; un même compte peut louer et mettre en location.
 */
@Component({
  selector: 'kp-accueil',
  standalone: true,
  imports: [RouterLink, MontantPipe, DateLonguePipe, VideComponent, CarteBienComponent, FriseComponent, SegmentedComponent,
    TirerPourActualiserDirective, IconComponent, DemandesRecuesComponent, AvatarComponent],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.scss',
})
export class AccueilComponent implements OnInit {
  private auth = inject(AuthService);
  private donneesProprietaire = inject(DonneesProprietaireService);
  private chat = inject(ChatStoreService);
  private contexte = inject(LogementContextService);
  private nav = inject(NavigationService);
  private chatService = inject(ChatService);

  readonly chargement = signal(true);
  readonly erreur = signal(false);
  readonly biens = signal<BienDTO[]>([]);
  /** Logements que le compte loue. */
  readonly logements = signal<BienDTO[]>([]);
  private readonly donnees = signal<DonneesProprietaire | null>(null);
  /** Recalculées quand un message arrive (compteur de non-lus en temps réel). */
  readonly taches = computed<Tache[]>(() => {
    const d = this.donnees();
    const accueil: Omit<DonneesAccueil, 'messagesNonLus'> | null = d;
    return accueil ? calculerTaches({ ...accueil, messagesNonLus: this.chat.unreadTotal() }) : [];
  });

  readonly prenom = computed(() => this.auth.currentUser()?.firstName ?? '');
  readonly nomComplet = computed(() => {
    const u = this.auth.currentUser();
    return u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '';
  });
  /** « Novembre 2026 » */
  readonly moisCourant = (() => {
    const t = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  })();
  readonly nomMois = new Date().toLocaleDateString('fr-FR', { month: 'long' });

  /** En-tête propriétaire dès l'arrivée (profil connu par la navigation), sans attendre la liste des biens. */
  readonly proprietaire = computed(() => this.biens().length > 0 || (this.chargement() && this.contexte.aDesBiens()));
  readonly biensActifs = computed(() => this.biens().filter(b => !b.archive));
  readonly chiffres = computed(() => calculerChiffres(this.biens(), this.donnees()?.quittances ?? []));
  /** Segments de la barre « Annonces en ligne » : un par bien actif. */
  readonly segmentsAnnonces = computed(() =>
    Array.from({ length: this.chiffres().actifs }, (_, i) => i < this.chiffres().annonces));

  /** Bien dont la location avance (le moins avancé de ceux qui ont un locataire ou une réservation). */
  readonly enCours = computed<{ bien: BienDTO; etapes: EtapesLocation } | null>(() => {
    const d = this.donnees();
    if (!d) return null;
    let choix: { bien: BienDTO; etapes: EtapesLocation } | null = null;
    for (const bien of this.biensActifs()) {
      if (!locataireDuBail(bien)) continue;
      const etapes = calculerEtapesLocation({
        bien,
        contrats: d.contrats.filter(c => c.bienId === bien.id),
        edls: d.edlsParBien.get(bien.id) ?? [],
        quittances: d.quittances.filter(q => q.bienId === bien.id),
      });
      // Jusqu'à l'état des lieux : ensuite, la location suit son cours (quittances dans « À faire »)
      if (!etapes.prochaine || etapes.courante >= 4) continue;
      if (!choix || etapes.courante < choix.etapes.courante) choix = { bien, etapes };
    }
    return choix;
  });

  /** Les tâches qui ne répètent pas la prochaine étape de la carte. */
  readonly autresTaches = computed(() => {
    const lien = this.enCours()?.etapes.prochaine?.lien;
    const cle = lien ? JSON.stringify(lien) : null;
    return this.taches().filter(t => JSON.stringify(t.lien) !== cle);
  });

  /**
   * Candidat (ni bien ni logement, profil de la navigation) : accueil « Votre recherche de logement ».
   * Les données de l'accueil sont lues comme pour tous les comptes ; elles tranchent une fois chargées.
   */
  readonly candidat = computed(() =>
    this.nav.profil() === 'candidat' && !this.biens().length && !this.logements().length);
  /** Dernières conversations (null tant qu'elles ne sont pas lues) et leur nombre total. */
  readonly conversations = signal<ConversationDTO[] | null>(null);
  readonly nbConversations = signal<number | null>(null);
  protected readonly nomCourt = nomCourt;
  protected readonly heureMessage = heureMessage;

  readonly filtre = signal<Filtre>('tous');
  readonly optionsFiltre = computed<OptionSegment<Filtre>[]>(() => {
    const actifs = this.biensActifs();
    const loues = actifs.filter(b => b.locataire).length;
    return [
      { valeur: 'tous', libelle: 'Tous', nombre: actifs.length },
      { valeur: 'loues', libelle: 'Loués', nombre: loues },
      { valeur: 'vacants', libelle: 'Vacants', nombre: actifs.length - loues },
    ];
  });
  readonly biensFiltres = computed(() => {
    const f = this.filtre();
    return this.biensActifs().filter(b => f === 'tous' || (f === 'loues') === !!b.locataire);
  });

  protected readonly vignette = vignette;

  constructor() {
    // Conversations lues seulement pour un candidat, une fois son profil établi (pas d'appel pour un propriétaire)
    effect(() => {
      if (this.candidat() && !this.chargement() && untracked(() => this.conversations() === null)) {
        untracked(() => this.chargerConversations());
      }
    });
  }

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(false);
    this.chat.loadUnreadCount();
    // Actualisation : les conversations sont relues (la première lecture se fait dès que le profil est connu)
    if (this.conversations() !== null) this.chargerConversations();
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

  /** Même recherche que la liste de la messagerie (`POST /conversations/search`), cinq dernières. */
  private chargerConversations(): void {
    this.chatService.searchConversations({ page: 0, size: 5, lu: null, sortBy: 'lastMessageAt', sortDirection: 'DESC' }).subscribe({
      next: page => {
        this.conversations.set(page.contenu);
        this.nbConversations.set(page.totalElements);
      },
      error: () => {
        this.conversations.set([]);
        this.nbConversations.set(null);
      },
    });
  }

  /** L'autre personne de la conversation. */
  interlocuteur(c: ConversationDTO): { nom: string; email: string; photo: string | null } {
    const moi = this.auth.currentUser()?.email;
    return c.emailExpediteur === moi
      ? { nom: c.destinataireName, email: c.emailDestinataire, photo: c.destinatairePhotoUrl || null }
      : { nom: c.expediteurName, email: c.emailExpediteur, photo: c.expediteurPhotoUrl || null };
  }

  etat(b: BienDTO): EtatBien {
    if (b.locataire) return { libelle: 'Loué', ton: 'ok' };
    if (b.reservation) return { libelle: 'Réservé', ton: 'attention' };
    return { libelle: 'Vacant', ton: 'attention' };
  }

  /** « Lyon · Lucas Bernard », « Lyon · réservé par Inès Moreau », « Lyon ». */
  sousTitre(b: BienDTO): string {
    const p = b.locataire ?? b.reservation?.locataire;
    const nom = p ? `${p.firstName} ${p.lastName}` : '';
    return [b.ville, b.locataire ? nom : p ? `réservé par ${nom}` : ''].filter(Boolean).join(' · ');
  }

  nomDuLocataire(b: BienDTO): string {
    const p = locataireDuBail(b);
    return p ? `${p.firstName} ${p.lastName}` : '';
  }
}
