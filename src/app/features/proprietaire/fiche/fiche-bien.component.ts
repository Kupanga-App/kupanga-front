import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { BienService } from '../../biens/services/bien.service';
import { ContratService } from '../../gestion-logement/services/contrat.service';
import { EdlService } from '../../gestion-logement/services/edl.service';
import { QuittanceService } from '../../gestion-logement/services/quittance.service';
import { ChatService } from '../../messagerie/services/chat.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { finDeReservation } from '../../biens/models/location.model';
import { FinDeBailComponent } from '../../biens/components/fin-de-bail.component';
import {
  BienDTO, LIBELLES_EQUIPEMENT, adresseLisible, libelleTypeBien, positionApproximative,
} from '../../biens/models/bien.model';
import { ContratDTO } from '../../gestion-logement/models/contrat.model';
import { EtatDesLieuxDTO } from '../../gestion-logement/models/edl.model';
import { QuittanceDTO } from '../../gestion-logement/models/quittance.model';
import { ConversationDTO } from '../../messagerie/models/chat.models';
import { MontantPipe, formatMontant } from '../../../core/money/montant';
import { lienAppel } from '../../../core/telephone/telephone';
import { DateLonguePipe, Statut, dateLongue, heureMessage, moisAnnee, statutQuittance, statutSignature } from '../../../shared/format';
import { GalerieComponent } from '../../../shared/ui/galerie.component';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { StatutComponent } from '../../../shared/ui/statut.component';
import { VideComponent } from '../../../shared/ui/vide.component';
import { FriseComponent } from '../../../shared/ui/frise.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CarteBienComponent } from '../../../shared/components/carte-bien/carte-bien.component';
import { LieuxProchesComponent } from '../../../shared/ui/lieux-proches.component';
import { FicheEnteteComponent, OngletVacant } from './fiche-entete.component';
import { bailLePlusRecent, calculerEtapesLocation, precisionEtat } from '../etapes-location';

/** Une case des caractéristiques. */
interface Tuile {
  libelle: string;
  valeur: string;
}

/**
 * Vue d'ensemble d'un bien du propriétaire (`Fiche-Bien-Loue`, `Fiche-Bien-Vacant`) : prochaine étape, photos,
 * frise de la location, caractéristiques, locataire et contact, documents, localisation. Bien vacant : la dernière
 * personne qui a écrit (liste des conversations, déjà appelée par la messagerie) et l'onglet local « Annonce ».
 */
@Component({
  selector: 'kp-fiche-bien',
  standalone: true,
  imports: [FinDeBailComponent, LieuxProchesComponent, NgTemplateOutlet,
    RouterLink, MontantPipe, DateLonguePipe, FicheEnteteComponent, GalerieComponent, AvatarComponent,
    StatutComponent, VideComponent, IconComponent, CarteBienComponent, FriseComponent,
  ],
  templateUrl: './fiche-bien.component.html',
  styleUrl: './fiche-bien.component.scss',
})
export class FicheBienComponent implements OnInit {
  readonly id = input.required<string>();

  private bienService = inject(BienService);
  private contratService = inject(ContratService);
  private edlService = inject(EdlService);
  private quittanceService = inject(QuittanceService);
  private chatService = inject(ChatService);
  private auth = inject(AuthService);

  readonly bien = signal<BienDTO | null>(null);
  readonly contrats = signal<ContratDTO[]>([]);
  readonly edls = signal<EtatDesLieuxDTO[]>([]);
  readonly quittances = signal<QuittanceDTO[]>([]);
  /** Conversations au sujet de ce bien (bien vacant seulement), la plus récente d'abord. */
  readonly conversations = signal<ConversationDTO[]>([]);
  readonly conversationsCompletes = signal(true);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly ongletVacant = signal<OngletVacant>('apercu');

  readonly lienAppel = lienAppel;
  protected readonly finDeReservation = finDeReservation;
  protected readonly heureMessage = heureMessage;

  /** L'API trie par date de début ; deux baux du même jour sont départagés ici. */
  readonly bail = computed(() => bailLePlusRecent(this.contrats()));
  readonly statutBail = computed<Statut | null>(() => {
    const b = this.bail();
    return b ? statutSignature(b.statut, 'proprietaire') : null;
  });
  readonly statutEdl = computed<Statut | null>(() => {
    const e = this.edls()[0];
    return e ? statutSignature(e.statut, 'proprietaire') : null;
  });
  /** L'API trie par année puis date de création : le mois (texte dans la réponse) est départagé ici. */
  readonly derniereQuittance = computed(() =>
    [...this.quittances()].sort((a, b) => Number(b.annee) - Number(a.annee) || Number(b.mois) - Number(a.mois))[0] ?? null);
  readonly statutDerniereQuittance = computed<Statut | null>(() => {
    const q = this.derniereQuittance();
    return q ? statutQuittance(q.statut) : null;
  });
  readonly moisDerniereQuittance = computed(() => {
    const q = this.derniereQuittance();
    return q ? moisAnnee(q.mois, q.annee) : '';
  });

  readonly etapes = computed(() => {
    const bien = this.bien();
    return bien ? calculerEtapesLocation({ bien, contrats: this.contrats(), edls: this.edls(), quittances: this.quittances() }) : null;
  });
  /** Quatre étapes à l'écran : avant le choix du locataire, Annonce → État des lieux ; ensuite Réservation → Quittances. */
  readonly etapesAffichees = computed(() => {
    const e = this.etapes();
    if (!e) return [];
    return e.courante <= 1 ? e.etapes.slice(0, 4) : e.etapes.slice(1);
  });
  readonly precision = computed(() => {
    const e = this.etapes();
    return e ? precisionEtat(e) : null;
  });

  /** Bien sans locataire ni réservation, non archivé. */
  readonly vacant = computed(() => {
    const b = this.bien();
    return !!b && !b.locataire && !b.reservation && !b.archive;
  });
  readonly afficheDocuments = computed(() => {
    const b = this.bien();
    return !!b && (!!b.locataire || !!b.reservation || this.contrats().length > 0 || this.edls().length > 0 || this.quittances().length > 0);
  });

  private readonly monEmail = computed(() => this.auth.currentUser()?.email ?? '');
  /** Dernière personne qui a écrit au sujet de ce bien. */
  readonly dernierMessage = computed(() => {
    const c = this.conversations()[0];
    if (!c) return null;
    const moi = this.monEmail();
    const estExpediteur = c.emailExpediteur === moi;
    return {
      nom: (estExpediteur ? c.destinataireName : c.expediteurName) || (estExpediteur ? c.emailDestinataire : c.emailExpediteur),
      photo: estExpediteur ? c.destinatairePhotoUrl : c.expediteurPhotoUrl,
      email: estExpediteur ? c.emailDestinataire : c.emailExpediteur,
      texte: c.lastMessage,
      date: c.lastMessageAt,
    };
  });
  readonly nbPersonnes = computed(() => this.conversations().length);

  readonly nomLocataire = computed(() => {
    const l = this.bien()?.locataire;
    return l ? `${l.firstName} ${l.lastName}` : '';
  });
  readonly lienMessage = computed(() => {
    const b = this.bien();
    return b?.locataire ? { bienId: b.id, interlocuteur: b.locataire.mail } : null;
  });
  readonly lienWhatsapp = computed(() => {
    const tel = this.bien()?.locataire?.telephone;
    return tel ? `https://wa.me/${tel.replace(/\D/g, '')}` : null;
  });

  readonly typeBien = computed(() => libelleTypeBien(this.bien()?.typeBien));
  readonly adresse = computed(() => {
    const b = this.bien();
    return b ? adresseLisible(b) : '';
  });
  readonly equipements = computed(() => (this.bien()?.equipements ?? []).map(e => LIBELLES_EQUIPEMENT[e] ?? e));
  readonly positionApprox = computed(() => positionApproximative(this.bien()?.precisionLocalisation));
  readonly photos = computed(() => this.bien()?.images ?? []);

  /** Caractéristiques en tuiles : seulement celles que le bien renseigne. */
  readonly tuiles = computed<Tuile[]>(() => {
    const b = this.bien();
    if (!b) return [];
    const montant = (v: number | undefined) => formatMontant(v, b.devise, 0);
    const t: (Tuile | null)[] = [
      { libelle: 'Type', valeur: this.typeBien() },
      b.surfaceHabitable ? { libelle: 'Surface', valeur: `${b.surfaceHabitable} m²` } : null,
      b.nombrePieces ? { libelle: 'Pièces', valeur: String(b.nombrePieces) } : null,
      b.nombreChambres ? { libelle: 'Chambres', valeur: String(b.nombreChambres) } : null,
      { libelle: 'Meublé', valeur: b.meuble ? 'Oui' : 'Non' },
      b.classeEnergie ? { libelle: 'DPE', valeur: b.classeEnergie } : null,
      b.loyerMensuel != null ? { libelle: 'Loyer', valeur: montant(b.loyerMensuel) } : null,
      b.depotGarantie ? { libelle: 'Dépôt de garantie', valeur: montant(b.depotGarantie) } : null,
      b.garantieMois != null ? { libelle: 'Garantie', valeur: `${b.garantieMois} mois de loyer` } : null,
      b.avanceMois != null ? { libelle: 'Loyers d’avance', valeur: `${b.avanceMois} mois` } : null,
      b.disponibleDe ? { libelle: 'Disponible le', valeur: dateLongue(b.disponibleDe) } : null,
    ];
    return t.filter((x): x is Tuile => !!x);
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    const id = Number(this.id());
    if (!Number.isInteger(id) || id <= 0) {
      this.erreur.set('Ce bien n’existe pas.');
      this.chargement.set(false);
      return;
    }
    this.chargement.set(true);
    this.erreur.set(null);
    forkJoin({
      bien: this.bienService.getPrive(id),
      contrats: this.contratService.getByBien(id).pipe(catchError(() => of([]))),
      edls: this.edlService.getByBien(id).pipe(catchError(() => of([]))),
      quittances: this.quittanceService.getByBien(id).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ bien, contrats, edls, quittances }) => {
        this.bien.set(bien);
        this.contrats.set(contrats);
        this.edls.set(edls);
        this.quittances.set(quittances);
        this.chargement.set(false);
        if (this.vacant()) this.chargerConversations(bien);
      },
      error: (err: HttpErrorResponse) => {
        this.erreur.set(
          err.status === 404 || err.status === 403 ? 'Ce bien n’existe pas ou ne vous appartient pas.' : 'Vérifiez votre connexion puis réessayez.',
        );
        this.chargement.set(false);
      },
    });
  }

  /**
   * Personnes qui ont écrit au sujet d'un bien vacant : même recherche que la messagerie (`POST /conversations/search`),
   * filtrée sur le titre (recherche partielle de l'API, 100 caractères au plus), puis sur l'identifiant du bien.
   */
  private chargerConversations(bien: BienDTO): void {
    this.chatService.searchConversations({
      nomDuBien: bien.titre.slice(0, 100),
      lu: null,
      page: 0,
      size: 20,
      sortBy: 'lastMessageAt',
      sortDirection: 'DESC',
    }).pipe(catchError(() => of(null))).subscribe(page => {
      this.conversations.set(page?.contenu.filter(c => c.bienId === bien.id) ?? []);
      this.conversationsCompletes.set(!page || page.dernierepage !== false);
    });
  }
}
