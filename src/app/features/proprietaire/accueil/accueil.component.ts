import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LogementContextService } from '../../../core/services/logement-context.service';
import { DonneesProprietaire, DonneesProprietaireService } from '../donnees-proprietaire.service';
import { ChatStoreService } from '../../messagerie/services/chat-store.service';
import { BienDTO, locataireDuBail, vignette } from '../../biens/models/bien.model';
import { MontantPipe } from '../../../core/money/montant';
import { DateLonguePipe } from '../../../shared/format';
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
 * mois, bien dont la location avance, autres tâches, liste des biens filtrable. Un compte qui loue ou cherche garde
 * ses demandes, réservations et logements loués ; un même compte peut louer et mettre en location.
 */
@Component({
  selector: 'kp-accueil',
  standalone: true,
  imports: [RouterLink, MontantPipe, DateLonguePipe, VideComponent, CarteBienComponent, FriseComponent, SegmentedComponent,
    TirerPourActualiserDirective, IconComponent, DemandesRecuesComponent],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.scss',
})
export class AccueilComponent implements OnInit {
  private auth = inject(AuthService);
  private donneesProprietaire = inject(DonneesProprietaireService);
  private chat = inject(ChatStoreService);
  private contexte = inject(LogementContextService);

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
