import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BienService } from '../biens/services/bien.service';
import { LogementContextService } from '../../core/services/logement-context.service';
import { AppNotificationService } from '../notifications/services/app-notification.service';
import { BienDTO, adresseLisible, libelleTypeBien } from '../biens/models/bien.model';
import { LocataireDashboardDTO, QuittanceBackendDTO } from './locataire.models';
import { MontantPipe } from '../../core/money/montant';
import { lienAppel } from '../../core/telephone/telephone';
import { DateLonguePipe, DateRelativePipe, de, joursAvant, moisAnnee, statutQuittance, statutSignature } from '../../shared/format';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { StatutComponent } from '../../shared/ui/statut.component';
import { VideComponent } from '../../shared/ui/vide.component';
import { TirerPourActualiserDirective } from '../../shared/ui/tirer-pour-actualiser.directive';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CarteBienComponent } from '../../shared/components/carte-bien/carte-bien.component';

interface DocumentASigner {
  cle: string;
  titre: string;
  lien: string | null;
}

/**
 * Mon logement (locataire) : le loyer du mois et son statut, les documents à signer, le contact du propriétaire,
 * l'adresse et le bail (AUDIT.md §8.4). Aucun paiement dans l'application : le propriétaire déclare le loyer reçu.
 */
@Component({
  selector: 'kp-mon-logement',
  standalone: true,
  imports: [
    RouterLink, MontantPipe, DateLonguePipe, DateRelativePipe, PageHeaderComponent, AvatarComponent, StatutComponent,
    VideComponent, TirerPourActualiserDirective, IconComponent, CarteBienComponent,
  ],
  templateUrl: './mon-logement.component.html',
  styleUrl: './mon-logement.component.scss',
})
export class MonLogementComponent implements OnInit {
  private http = inject(HttpClient);
  private bienService = inject(BienService);
  private logement = inject(LogementContextService);
  protected notifications = inject(AppNotificationService);

  readonly lienAppel = lienAppel;
  readonly chargement = signal(true);
  readonly erreur = signal(false);
  readonly logements = signal<BienDTO[]>([]);
  readonly bienId = signal<number | null>(null);
  readonly bien = signal<BienDTO | null>(null);
  readonly tableau = signal<LocataireDashboardDTO | null>(null);

  readonly adresse = computed(() => {
    const b = this.bien();
    return b ? adresseLisible(b) : this.tableau()?.bien.adresse ?? '';
  });
  readonly typeBien = computed(() => libelleTypeBien(this.bien()?.typeBien ?? this.tableau()?.bien.type));
  readonly photo = computed(() => this.bien()?.vignettes?.[0] ?? this.bien()?.images?.[0] ?? this.tableau()?.bien.photos?.[0] ?? null);
  readonly proprietaire = computed(() => this.bien()?.proprietaire ?? null);
  readonly nomProprietaire = computed(() => {
    const p = this.proprietaire();
    return p ? `${p.firstName} ${p.lastName}`.trim() : this.tableau()?.bien.nomProprietaire ?? '';
  });
  readonly lienWhatsapp = computed(() => {
    const tel = this.proprietaire()?.telephone;
    return tel ? `https://wa.me/${tel.replace(/\D/g, '')}` : null;
  });
  readonly lienMessage = computed(() => {
    const b = this.bien();
    return b ? { bienId: b.id, interlocuteur: b.proprietaire?.mail ?? null } : null;
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

  readonly aSigner = computed<DocumentASigner[]>(() => {
    const t = this.tableau();
    if (!t) return [];
    const jeton = (type: string, id: number) =>
      this.notifications.notifications().find(n => n.type === type && n.referenceId === id && !!n.lien)?.lien ?? null;
    const docs: DocumentASigner[] = [];
    if (t.contrat?.statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE') {
      const j = jeton('INVITATION_SIGNATURE_CONTRAT', t.contrat.id);
      docs.push({ cle: `c${t.contrat.id}`, titre: 'Votre bail', lien: j ? `/contrats/signer/${j}` : null });
    }
    for (const e of t.etatsDesLieux ?? []) {
      if (e.statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE') {
        const j = jeton('INVITATION_SIGNATURE_EDL', e.id);
        docs.push({
          cle: `e${e.id}`, titre: `État des lieux ${e.type === 'ENTREE' ? 'd’entrée' : 'de sortie'}`,
          lien: j ? `/edl/signer/${j}` : null,
        });
      }
    }
    return docs;
  });
  readonly statutBail = computed(() => statutSignature(this.tableau()?.contrat?.statut, 'locataire'));

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(false);
    this.notifications.loadUnread();
    this.bienService.getMesBiens().subscribe({
      next: biens => {
        this.logements.set(biens);
        const actuel = this.bienId() ?? (biens.find(b => !b.archive) ?? biens[0])?.id ?? null;
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
    forkJoin({
      tableau: this.http.get<LocataireDashboardDTO>(`${environment.apiUrl}/locataire/dashboard/${bienId}`).pipe(catchError(() => of(null))),
      bien: this.bienService.getPrive(bienId).pipe(catchError(() => of(null))),
    }).subscribe(({ tableau, bien }) => {
      this.tableau.set(tableau);
      this.bien.set(bien);
      this.chargement.set(false);
      this.erreur.set(!tableau && !bien);
    });
  }
}
