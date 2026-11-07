import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BienService } from '../biens/services/bien.service';
import { ContratService } from '../gestion-logement/services/contrat.service';
import { LogementContextService, logementsLoues } from '../../core/services/logement-context.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { AppNotificationService } from '../notifications/services/app-notification.service';
import { BienDTO, LIBELLES_EQUIPEMENT, adresseLisible, libelleTypeBien } from '../biens/models/bien.model';
import { ContratDTO } from '../gestion-logement/models/contrat.model';
import { LocataireDashboardDTO, QuittanceBackendDTO } from './locataire.models';
import { Devise, MontantPipe } from '../../core/money/montant';
import { lienAppel } from '../../core/telephone/telephone';
import { DateLonguePipe, DateRelativePipe, de, joursAvant, moisAnnee, statutQuittance } from '../../shared/format';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { StatutComponent } from '../../shared/ui/statut.component';
import { VideComponent } from '../../shared/ui/vide.component';
import { FriseComponent } from '../../shared/ui/frise.component';
import { GalerieComponent } from '../../shared/ui/galerie.component';
import { TirerPourActualiserDirective } from '../../shared/ui/tirer-pour-actualiser.directive';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CarteBienComponent } from '../../shared/components/carte-bien/carte-bien.component';
import { LieuxProchesComponent } from '../../shared/ui/lieux-proches.component';
import { DemandesRecuesComponent } from './demandes-recues.component';
import { LogementEnteteComponent } from './logement-entete.component';
import { FinDeBailComponent } from '../biens/components/fin-de-bail.component';
import { bailCourant, calculerEtapesLocataire } from './etapes-locataire';
import { nomCourt } from './nom-court';

interface DocumentASigner {
  cle: string;
  /** « le bail », « l’état des lieux d’entrée » */
  quoi: string;
  lien: string | null;
}

interface Tuile {
  libelle: string;
  valeur: string;
}

/** Montants du loyer : bail signé, sinon bail à signer, sinon annonce. */
interface MonLoyer {
  source: string | null;
  loyer: number;
  charges: number;
  devise?: Devise;
  depot: number | null;
  garantieMois: number | null;
  avanceMois: number | null;
}

/**
 * Mon logement (locataire, maquette `Mon-Logement`) : à faire (document à signer ou loyer du mois), où en est la
 * location, photos, caractéristiques, loyer, propriétaire, localisation et fin de location. Aucun paiement dans
 * l'application : le propriétaire déclare le loyer reçu.
 */
@Component({
  selector: 'kp-mon-logement',
  standalone: true,
  imports: [
    RouterLink, MontantPipe, DateLonguePipe, DateRelativePipe, PageHeaderComponent, AvatarComponent, StatutComponent,
    VideComponent, FriseComponent, GalerieComponent, TirerPourActualiserDirective, IconComponent, CarteBienComponent,
    LieuxProchesComponent, DemandesRecuesComponent, FinDeBailComponent, LogementEnteteComponent,
  ],
  templateUrl: './mon-logement.component.html',
  styleUrl: './mon-logement.component.scss',
})
export class MonLogementComponent implements OnInit {
  private http = inject(HttpClient);
  private bienService = inject(BienService);
  private contratService = inject(ContratService);
  private logement = inject(LogementContextService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  protected notifications = inject(AppNotificationService);

  readonly lienAppel = lienAppel;
  readonly chargement = signal(true);
  readonly erreur = signal(false);
  readonly logements = signal<BienDTO[]>([]);
  readonly bienId = signal<number | null>(null);
  readonly bien = signal<BienDTO | null>(null);
  readonly tableau = signal<LocataireDashboardDTO | null>(null);
  /** Baux du logement qui concernent le compte (même recherche que la page Documents) ; vide hors ligne. */
  readonly baux = signal<ContratDTO[]>([]);

  readonly adresse = computed(() => {
    const b = this.bien();
    return b ? adresseLisible(b) : this.tableau()?.bien.adresse ?? '';
  });
  readonly typeBien = computed(() => libelleTypeBien(this.bien()?.typeBien ?? this.tableau()?.bien.type));
  readonly titre = computed(() => this.bien()?.titre ?? this.typeBien());
  readonly photos = computed(() => this.bien()?.images?.length ? this.bien()!.images! : this.tableau()?.bien.photos ?? []);
  readonly proprietaire = computed(() => this.bien()?.proprietaire ?? null);
  readonly nomProprietaire = computed(() => {
    const p = this.proprietaire();
    return p ? `${p.firstName} ${p.lastName}`.trim() : this.tableau()?.bien.nomProprietaire ?? '';
  });
  /** « Claire M. » */
  readonly proprietaireCourt = computed(() => {
    const p = this.proprietaire();
    return p ? nomCourt(p.firstName, p.lastName) : nomCourt(this.nomProprietaire());
  });
  readonly lienWhatsapp = computed(() => {
    const tel = this.proprietaire()?.telephone;
    return tel ? `https://wa.me/${tel.replace(/\D/g, '')}` : null;
  });
  readonly lienMessage = computed(() => {
    const b = this.bien();
    return b ? { bienId: b.id, interlocuteur: b.proprietaire?.mail ?? null } : null;
  });

  readonly equipements = computed(() => (this.bien()?.equipements ?? []).map(e => LIBELLES_EQUIPEMENT[e] ?? e));
  /** Caractéristiques en tuiles : seulement celles que le bien renseigne. */
  readonly tuiles = computed<Tuile[]>(() => {
    const b = this.bien();
    const t = this.tableau()?.bien;
    const surface = b?.surfaceHabitable ?? t?.surface;
    const pieces = b?.nombrePieces ?? t?.nbPieces;
    const tuiles: (Tuile | null)[] = [
      { libelle: 'Type', valeur: this.typeBien() },
      surface ? { libelle: 'Surface', valeur: `${surface} m²` } : null,
      pieces ? { libelle: 'Pièces', valeur: String(pieces) } : null,
      b?.nombreChambres ? { libelle: 'Chambres', valeur: String(b.nombreChambres) } : null,
      b ? { libelle: 'Meublé', valeur: b.meuble ? 'Oui' : 'Non' } : null,
      b?.etage != null ? { libelle: 'Étage', valeur: b.etage === 0 ? 'Rez-de-chaussée' : String(b.etage) } : null,
      b?.classeEnergie ? { libelle: 'DPE', valeur: b.classeEnergie } : null,
      b?.ville ? { libelle: 'Ville', valeur: b.ville } : null,
    ];
    return tuiles.filter((x): x is Tuile => !!x);
  });

  /** Bail courant du compte (le tableau de bord ne renvoie que le bail signé). */
  readonly bail = computed(() => bailCourant(this.baux()) as ContratDTO | null);

  /** Ids des baux pour lesquels une invitation à signer est arrivée (notifications non lues). */
  private readonly invitationsBail = computed(() => this.notifications.notifications()
    .filter(n => n.type === 'INVITATION_SIGNATURE_CONTRAT' && n.referenceId != null)
    .map(n => n.referenceId as number));

  readonly etapes = computed(() => {
    const t = this.tableau();
    if (!t && !this.bien()) return null;
    return calculerEtapesLocataire({
      reserve: false,
      proprietaire: this.proprietaireCourt(),
      baux: this.baux(),
      bailSigne: t?.contrat ?? null,
      invitationsBail: this.invitationsBail(),
      etatsDesLieux: t?.etatsDesLieux ?? [],
      nombreQuittances: t?.quittances?.length ?? 0,
    });
  });

  /** Prochain loyer à payer (le plus ancien non reçu), sinon le dernier reçu. */
  readonly loyer = computed<{ q: QuittanceBackendDTO; aPayer: boolean } | null>(() => {
    const quittances = [...(this.tableau()?.quittances ?? [])].sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance));
    const aPayer = quittances.find(q => q.statut !== 'PAYEE');
    if (aPayer) return { q: aPayer, aPayer: true };
    const dernier = quittances[quittances.length - 1];
    return dernier ? { q: dernier, aPayer: false } : null;
  });
  readonly titreLoyer = computed(() => {
    const l = this.loyer();
    return l ? `Loyer ${de(moisAnnee(l.q.mois, l.q.annee))}` : '';
  });
  readonly enRetard = computed(() => {
    const l = this.loyer();
    if (!l?.aPayer) return false;
    const j = joursAvant(l.q.dateEcheance);
    return l.q.statut === 'EN_RETARD' || l.q.statut === 'IMPAYEE' || (j !== null && j < 0);
  });
  readonly statutLoyer = computed(() => statutQuittance(this.loyer()?.q.statut));

  /** Montants : bail signé (tableau de bord), sinon bail à signer, sinon conditions de l'annonce. */
  readonly monLoyer = computed<MonLoyer | null>(() => {
    const signe = this.tableau()?.contrat;
    const bail = this.bail();
    const bailSigne = bail?.statut === 'SIGNE' && (!signe || bail.id === signe.id) ? bail : null;
    if (signe) {
      return {
        source: null, loyer: signe.loyerMensuel, charges: signe.charges ?? 0, devise: signe.devise,
        depot: signe.depotGarantie ?? null, garantieMois: bailSigne?.garantieMois ?? null, avanceMois: bailSigne?.avanceMois ?? null,
      };
    }
    if (bail && bail.statut !== 'BROUILLON') {
      return {
        source: 'Selon le bail à signer', loyer: bail.loyerMensuel, charges: bail.chargesMensuelles ?? 0, devise: bail.devise,
        depot: bail.depotGarantie ?? null, garantieMois: bail.garantieMois ?? null, avanceMois: bail.avanceMois ?? null,
      };
    }
    const b = this.bien();
    if (b?.loyerMensuel == null) return null;
    return {
      source: 'Selon l’annonce', loyer: b.loyerMensuel, charges: b.chargesMensuelles ?? 0, devise: b.devise,
      depot: b.depotGarantie ?? null, garantieMois: b.garantieMois ?? null, avanceMois: b.avanceMois ?? null,
    };
  });

  /**
   * Documents à signer. Le bail en attente se lit dans les baux du logement (le tableau de bord ne renvoie que le
   * bail signé), à défaut dans une invitation reçue ; le lien vient des notifications (sinon : e-mail).
   */
  readonly aSigner = computed<DocumentASigner[]>(() => {
    const t = this.tableau();
    if (!t && !this.bien()) return [];
    const jeton = (type: string, id: number) =>
      this.notifications.notifications().find(n => n.type === type && n.referenceId === id && !!n.lien)?.lien ?? null;
    const docs: DocumentASigner[] = [];
    const bail = this.bail();
    const signe = t?.contrat?.id ?? null;
    const idBail = bail
      ? (bail.statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE' ? bail.id : null)
      : this.invitationsBail().find(id => id !== signe) ?? null;
    if (idBail !== null) {
      const j = jeton('INVITATION_SIGNATURE_CONTRAT', idBail);
      docs.push({ cle: `c${idBail}`, quoi: 'le bail', lien: j ? `/contrats/signer/${j}` : null });
    }
    for (const e of t?.etatsDesLieux ?? []) {
      if (e.statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE') {
        const j = jeton('INVITATION_SIGNATURE_EDL', e.id);
        docs.push({
          cle: `e${e.id}`, quoi: `l’état des lieux ${e.type === 'ENTREE' ? 'd’entrée' : 'de sortie'}`,
          lien: j ? `/edl/signer/${j}` : null,
        });
      }
    }
    return docs;
  });
  readonly premierASigner = computed(() => this.aSigner()[0] ?? null);
  /** Le propriétaire a déjà signé le bail à signer. */
  readonly proprioASigne = computed(() => !!this.bail()?.proprietaireASigné);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(false);
    this.notifications.loadUnread();
    this.bienService.getMesBiens().subscribe({
      next: tous => {
        // Lot 3 : le compte peut aussi posséder des biens ; ici, seulement ceux qu'il loue
        const biens = logementsLoues(tous, this.auth.currentUser()?.id);
        this.logements.set(biens);
        const demande = Number(this.route.snapshot.queryParamMap.get('bien'));
        const choisi = biens.find(b => b.id === demande)?.id ?? null;
        const actuel = choisi ?? this.bienId() ?? (biens.find(b => !b.archive) ?? biens[0])?.id ?? null;
        this.logement.set(actuel);
        if (actuel === null) {
          this.chargement.set(false);
          return;
        }
        this.choisir(actuel);
      },
      error: () => {
        // Hors ligne : dernier logement connu (le tableau de bord est gardé par le service worker)
        const id = this.logement.logementBienId();
        if (id !== null) {
          this.choisir(id);
        } else {
          this.chargement.set(false);
          this.erreur.set(true);
        }
      },
    });
  }

  choisir(id: number | string): void {
    const bienId = Number(id);
    this.bienId.set(bienId);
    this.chargement.set(true);
    const mail = this.auth.currentUser()?.email?.toLowerCase();
    forkJoin({
      tableau: this.http.get<LocataireDashboardDTO>(`${environment.apiUrl}/locataire/dashboard/${bienId}`).pipe(catchError(() => of(null))),
      bien: this.bienService.getPrive(bienId).pipe(catchError(() => of(null))),
      baux: this.contratService.getByBien(bienId).pipe(catchError(() => of([] as ContratDTO[]))),
    }).subscribe(({ tableau, bien, baux }) => {
      this.tableau.set(tableau);
      this.bien.set(bien);
      // Seulement les baux du compte (pas ceux d'un locataire précédent)
      this.baux.set(baux.filter(c => !mail || !c.locataire?.mail || c.locataire.mail.toLowerCase() === mail));
      this.chargement.set(false);
      this.erreur.set(!tableau && !bien);
    });
  }
}
