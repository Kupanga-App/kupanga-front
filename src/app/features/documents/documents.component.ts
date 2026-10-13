import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { DonneesProprietaire, DonneesProprietaireService } from '../proprietaire/donnees-proprietaire.service';
import { ContratService } from '../gestion-logement/services/contrat.service';
import { EdlService } from '../gestion-logement/services/edl.service';
import { AppNotificationService } from '../notifications/services/app-notification.service';
import { ContratDTO } from '../gestion-logement/models/contrat.model';
import { EtatDesLieuxDTO } from '../gestion-logement/models/edl.model';
import { MontantPipe } from '../../core/money/montant';
import { DateLonguePipe, Statut, moisAnnee, statutQuittance, statutSignature } from '../../shared/format';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SegmentedComponent, OptionSegment } from '../../shared/ui/segmented.component';
import { StatutComponent } from '../../shared/ui/statut.component';
import { VideComponent } from '../../shared/ui/vide.component';
import { TirerPourActualiserDirective } from '../../shared/ui/tirer-pour-actualiser.directive';
import { IconComponent } from '../../shared/components/icon/icon.component';

type Onglet = 'baux' | 'edl' | 'quittances';

/** Ligne de document : ouvre l'écran du bien (propriétaire) ou le PDF, ou la page de signature (locataire). */
interface Ligne {
  cle: string;
  titre: string;
  detail: string;
  statut: Statut;
  aTraiter: boolean;
  lien?: unknown[];
  pdf?: string;
  signer?: string;
}

/**
 * Documents (AUDIT.md §6.2) : baux, états des lieux et, pour le propriétaire, quittances de tous ses biens.
 * Le locataire signe depuis le lien de l'invitation (notification ou e-mail).
 */
@Component({
  selector: 'kp-documents',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, SegmentedComponent, StatutComponent, VideComponent, TirerPourActualiserDirective, IconComponent],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss',
})
export class DocumentsComponent implements OnInit {
  private auth = inject(AuthService);
  private donneesProprietaire = inject(DonneesProprietaireService);
  private contrats = inject(ContratService);
  private edls = inject(EdlService);
  private notifications = inject(AppNotificationService);

  private readonly montant = new MontantPipe();
  private readonly date = new DateLonguePipe();

  readonly proprietaire = computed(() => this.auth.currentUser()?.role === 'ROLE_PROPRIETAIRE');
  readonly onglet = signal<Onglet>('baux');
  readonly chargement = signal(true);
  readonly erreur = signal(false);
  private readonly donneesProp = signal<DonneesProprietaire | null>(null);
  private readonly contratsLoc = signal<ContratDTO[]>([]);
  private readonly edlsLoc = signal<EtatDesLieuxDTO[]>([]);

  // Recalculées à l'arrivée d'une invitation à signer (notification en temps réel)
  readonly baux = computed<Ligne[]>(() => {
    const d = this.donneesProp();
    return d ? this.bauxProprietaire(d) : this.bauxLocataire(this.contratsLoc());
  });
  readonly etats = computed<Ligne[]>(() => {
    const d = this.donneesProp();
    return d ? this.etatsProprietaire(d) : this.etatsLocataire(this.edlsLoc());
  });
  readonly quittances = computed<Ligne[]>(() => {
    const d = this.donneesProp();
    return d ? this.quittancesProprietaire(d) : [];
  });

  readonly options = computed<OptionSegment<Onglet>[]>(() => {
    const options: OptionSegment<Onglet>[] = [
      { valeur: 'baux', libelle: 'Baux', nombre: this.baux().filter(l => l.aTraiter).length },
      { valeur: 'edl', libelle: 'États des lieux', nombre: this.etats().filter(l => l.aTraiter).length },
    ];
    if (this.proprietaire()) {
      options.push({ valeur: 'quittances', libelle: 'Quittances', nombre: this.quittances().filter(l => l.aTraiter).length });
    }
    return options;
  });

  readonly lignes = computed(() => {
    switch (this.onglet()) {
      case 'edl': return this.etats();
      case 'quittances': return this.quittances();
      default: return this.baux();
    }
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(false);
    const fin = { next: () => this.chargement.set(false), error: () => { this.chargement.set(false); this.erreur.set(true); } };
    if (this.proprietaire()) {
      this.donneesProprietaire.charger().subscribe({ ...fin, next: d => { this.donneesProp.set(d); fin.next(); } });
    } else {
      this.notifications.loadUnread();
      forkJoin({
        contrats: this.contrats.search({ size: 50 }).pipe(map(p => p.contenu)),
        edls: this.edls.search({ size: 50 }).pipe(map(p => p.contenu), catchError(() => of([] as EtatDesLieuxDTO[]))),
      }).subscribe({
        ...fin,
        next: d => {
          this.contratsLoc.set(d.contrats);
          this.edlsLoc.set(d.edls);
          fin.next();
        },
      });
    }
  }

  private titreBien(d: DonneesProprietaire, id?: number): string {
    return d.biens.find(b => b.id === id)?.titre ?? '';
  }

  private bauxProprietaire(d: DonneesProprietaire): Ligne[] {
    const titre = (id?: number) => this.titreBien(d, id);
    return d.contrats.map(c => {
      const statut = statutSignature(c.statut, 'proprietaire');
      return {
        cle: `c${c.id}`, titre: titre(c.bienId) || c.adresseBien || 'Bail',
        detail: `Début le ${this.date.transform(c.dateDebut)} · ${[c.locataire?.firstName, c.locataire?.lastName].filter(Boolean).join(' ')}`,
        statut, aTraiter: statut.ton === 'attention' || c.statut === 'EXPIRE', lien: ['/biens', c.bienId, 'bail'],
      };
    });
  }

  private etatsProprietaire(d: DonneesProprietaire): Ligne[] {
    const titre = (id?: number) => this.titreBien(d, id);
    return [...d.edlsParBien].flatMap(([bienId, edls]) => edls.map(e => {
      const statut = statutSignature(e.statut, 'proprietaire');
      return {
        cle: `e${e.id}`, titre: `${e.type === 'ENTREE' ? 'Entrée' : 'Sortie'} · ${titre(bienId)}`,
        detail: `Réalisé le ${this.date.transform(e.dateRealisation)}`,
        statut, aTraiter: statut.ton === 'attention' || e.statut === 'EXPIRE', lien: ['/biens', bienId, 'etats-des-lieux'],
      };
    }));
  }

  private quittancesProprietaire(d: DonneesProprietaire): Ligne[] {
    const titre = (id?: number) => this.titreBien(d, id);
    return d.quittances.map(q => {
      const statut = statutQuittance(q.statut);
      return {
        cle: `q${q.id}`, titre: moisAnnee(q.mois, q.annee),
        detail: `${titre(q.bienId)} · ${this.montant.transform(q.montantTotal, q.devise)}`,
        statut, aTraiter: q.statut === 'EN_RETARD' || q.statut === 'IMPAYEE', lien: ['/biens', q.bienId, 'quittances'],
      };
    });
  }

  /** Jeton de signature de l'invitation non lue (l'API ne renvoie que les notifications non lues). */
  private jeton(type: string, id: number): string | undefined {
    return this.notifications.notifications().find(n => n.type === type && n.referenceId === id && !!n.lien)?.lien ?? undefined;
  }

  private bauxLocataire(contrats: ContratDTO[]): Ligne[] {
    return contrats.map(c => {
      const statut = statutSignature(c.statut, 'locataire');
      const aSigner = c.statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE';
      const t = aSigner ? this.jeton('INVITATION_SIGNATURE_CONTRAT', c.id) : undefined;
      return {
        cle: `c${c.id}`, titre: c.adresseBien || 'Bail',
        detail: `Début le ${this.date.transform(c.dateDebut)} · ${this.montant.transform(c.loyerMensuel, c.devise, 0)} par mois`,
        statut, aTraiter: aSigner, pdf: c.urlPdf, signer: t ? `/contrats/signer/${t}` : undefined,
      };
    });
  }

  private etatsLocataire(edls: EtatDesLieuxDTO[]): Ligne[] {
    return edls.map(e => {
      const statut = statutSignature(e.statut, 'locataire');
      const aSigner = e.statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE';
      const t = aSigner ? this.jeton('INVITATION_SIGNATURE_EDL', e.id) : undefined;
      return {
        cle: `e${e.id}`, titre: `État des lieux ${e.type === 'ENTREE' ? 'd’entrée' : 'de sortie'}`,
        detail: `${e.adresseBien ?? ''} · le ${this.date.transform(e.dateRealisation)}`,
        statut, aTraiter: aSigner, pdf: e.urlPdf, signer: t ? `/edl/signer/${t}` : undefined,
      };
    });
  }
}
