import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { QuittanceService } from '../gestion-logement/services/quittance.service';
import { LIBELLES_MODE_PAIEMENT, QuittanceDTO } from '../gestion-logement/models/quittance.model';
import { MontantPipe } from '../../core/money/montant';
import { DateLonguePipe, de, moisAnnee, statutQuittance } from '../../shared/format';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { StatutComponent } from '../../shared/ui/statut.component';
import { VideComponent } from '../../shared/ui/vide.component';
import { TirerPourActualiserDirective } from '../../shared/ui/tirer-pour-actualiser.directive';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { BienService } from '../biens/services/bien.service';
import { BienDTO } from '../biens/models/bien.model';
import { LogementContextService } from '../../core/services/logement-context.service';
import { LogementEnteteComponent } from './logement-entete.component';
import { nomCourt } from './nom-court';

/**
 * Quittances du locataire (maquette `Mon-Logement-Quittances`) : quittance du mois en tête, puis une table par année
 * (une carte par ligne sur téléphone) ; PDF de la quittance une fois le loyer déclaré reçu.
 */
@Component({
  selector: 'kp-mes-quittances',
  standalone: true,
  imports: [MontantPipe, DateLonguePipe, PageHeaderComponent, StatutComponent, VideComponent, TirerPourActualiserDirective, IconComponent,
    LogementEnteteComponent],
  template: `
    <div class="kp-page quittances" kpTirerPourActualiser (actualiser)="charger()">
      @if (logementId() !== null) {
        <kp-logement-entete [bien]="bien()" [chargement]="chargementBien()" titreDefaut="Mes quittances" />
      } @else {
        <kp-page-header titre="Mes quittances" />
      }

      @if (chargement() && !quittances().length) {
        <div class="kp-stack kp-stack--sm" aria-busy="true">
          @for (i of [1, 2, 3]; track i) {
            <span class="kp-skeleton kp-skeleton--carte"></span>
          }
        </div>
      } @else if (erreur()) {
        <kp-vide icone="wifi-off" titre="Quittances indisponibles" texte="Vérifiez votre connexion puis réessayez.">
          <button type="button" class="kp-btn kp-btn--secondary" (click)="charger()">Réessayer</button>
        </kp-vide>
      } @else if (!quittances().length) {
        <kp-vide icone="receipt" titre="Aucune quittance" texte="Votre propriétaire crée une quittance chaque mois ; elle apparaîtra ici." />
      } @else {
        <div class="kp-stack">
          <!-- Ce mois-ci -->
          @if (duMois(); as q) {
            <section class="kp-card ce-mois" aria-labelledby="titre-ce-mois">
              <span class="ce-mois__icone" [class.ce-mois__icone--ok]="q.statut === 'PAYEE'"><kp-icon name="receipt" [size]="20" [strokeWidth]="1.5" /></span>
              <div class="ce-mois__texte">
                <span class="petit">Ce mois-ci</span>
                <h2 id="titre-ce-mois">Quittance {{ de(mois(q)) }} · <span class="kp-montant">{{ q.montantTotal | montant: q.devise : 0 }}</span></h2>
                @if (q.statut === 'PAYEE') {
                  <p class="secondaire">Loyer déclaré reçu le {{ q.datePaiement | dateLongue }} : la quittance est disponible.</p>
                } @else {
                  <p class="secondaire">{{ statut(q).libelle }} : elle sera disponible dès que {{ proprietaire() }} aura déclaré le loyer reçu.</p>
                }
              </div>
              @if (q.statut === 'PAYEE' && q.urlPdf) {
                <a class="kp-btn kp-btn--secondary" [href]="q.urlPdf" target="_blank" rel="noopener"><kp-icon name="download" [size]="18" /> Télécharger</a>
              }
            </section>
          }

          <!-- Par année (regroupement à l'écran) -->
          @for (g of parAnnee(); track g.annee) {
            <section class="kp-table-cadre" [attr.aria-labelledby]="'annee-' + g.annee">
              <div class="annee">
                <h2 [id]="'annee-' + g.annee">{{ g.annee }}</h2>
                <span class="petit">{{ g.quittances.length }} quittance{{ g.quittances.length > 1 ? 's' : '' }}</span>
              </div>
              <table class="kp-table">
                <thead>
                  <tr>
                    <th scope="col">Mois</th>
                    <th scope="col">Montant</th>
                    <th scope="col">État</th>
                    <th scope="col" class="kp-table__secondaire">Détail</th>
                    <th scope="col"><span class="kp-sr-only">Documents</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (q of g.quittances; track q.id) {
                    <tr>
                      <td class="kp-table__titre mois">{{ mois(q) }}</td>
                      <td class="kp-table__nombre" data-libelle="Montant">{{ q.montantTotal | montant: q.devise }}</td>
                      <td><kp-statut [statut]="statut(q)" /></td>
                      <td class="kp-table__discret kp-table__secondaire detail">
                        @if (q.statut === 'PAYEE') {
                          Reçu le {{ q.datePaiement | dateLongue }}{{ q.modePaiement ? ' (' + libellesMode[q.modePaiement] + ')' : '' }}
                        } @else {
                          Échéance le {{ q.dateEcheance | dateLongue }}
                        }
                      </td>
                      <td class="kp-table__actions">
                        <span class="actions">
                          @if (q.urlPdf && q.statut === 'PAYEE') {
                            <a class="kp-btn kp-btn--secondary kp-btn--sm" [href]="q.urlPdf" target="_blank" rel="noopener"
                               [attr.aria-label]="'Télécharger la quittance ' + de(mois(q))"><kp-icon name="download" [size]="16" /> Télécharger</a>
                          }
                          @if (q.urlRecu) {
                            <a class="kp-btn kp-btn--ghost kp-btn--sm" [href]="q.urlRecu" target="_blank" rel="noopener"
                               [attr.aria-label]="'Reçu ' + de(mois(q))"><kp-icon name="image" [size]="16" /> Reçu</a>
                          }
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </section>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .petit { color: var(--kp-text-subtle); font-size: var(--kp-fs-secondary); }
    .secondaire { color: var(--kp-text-muted); font-size: 14px; }
    .ce-mois { flex-direction: row; flex-wrap: wrap; align-items: center; gap: var(--kp-space-4); }
    .ce-mois > .kp-btn { margin-left: auto; }
    .ce-mois__icone {
      display: grid; place-items: center; flex: none; width: 44px; height: 44px; border-radius: var(--kp-radius-md);
      background: var(--kp-state-warning-bg); color: var(--kp-state-warning-text);
    }
    .ce-mois__icone--ok { background: var(--kp-state-success-bg); color: var(--kp-state-success-text); }
    .ce-mois__texte { display: flex; flex: 1 1 280px; flex-direction: column; gap: 2px; min-width: 0; }
    .ce-mois__texte h2 { font-size: var(--kp-fs-card-title); font-weight: 500; }
    .mois::first-letter { text-transform: uppercase; }
    .annee { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 16px; }
    .annee h2 { font-size: var(--kp-fs-body); font-weight: 500; }
    .actions { display: inline-flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
    .detail { white-space: nowrap; }
    @media (max-width: 767px) {
      .annee { padding: 8px 0; }
    }
  `],
})
export class MesQuittancesComponent implements OnInit {
  private quittanceService = inject(QuittanceService);
  private bienService = inject(BienService);
  private logement = inject(LogementContextService);

  /** Logement loué (en-tête et onglets de Mon logement), lu comme sur Mon logement. */
  readonly logementId = this.logement.logementBienId;
  readonly bien = signal<BienDTO | null>(null);
  readonly chargementBien = signal(false);

  readonly quittances = signal<QuittanceDTO[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal(false);
  readonly libellesMode = LIBELLES_MODE_PAIEMENT;
  readonly statut = (q: QuittanceDTO) => statutQuittance(q.statut);
  readonly mois = (q: QuittanceDTO) => moisAnnee(q.mois, q.annee);
  protected readonly de = de;

  /** « Claire M. », sinon « votre propriétaire ». */
  readonly proprietaire = computed(() => {
    const p = this.bien()?.proprietaire;
    return p ? nomCourt(p.firstName, p.lastName) : 'votre propriétaire';
  });

  /** Quittances par année, la plus récente d'abord ; mois décroissants (l'API renvoie le mois en texte). */
  readonly parAnnee = computed(() => {
    const groupes = new Map<number, QuittanceDTO[]>();
    const triees = [...this.quittances()].sort((a, b) => b.annee - a.annee || Number(b.mois) - Number(a.mois));
    for (const q of triees) {
      groupes.set(q.annee, [...(groupes.get(q.annee) ?? []), q]);
    }
    return [...groupes].map(([annee, quittances]) => ({ annee, quittances }));
  });

  /** Quittance du mois en cours, s'il y en a une. */
  readonly duMois = computed(() => {
    const maintenant = new Date();
    return this.quittances().find(q =>
      q.annee === maintenant.getFullYear() && Number(q.mois) === maintenant.getMonth() + 1) ?? null;
  });

  ngOnInit(): void {
    this.charger();
  }

  constructor() {
    // Le logement loué peut n'être connu qu'après l'ouverture de la page (espaces du compte relus à la connexion)
    effect(() => {
      const id = this.logementId();
      if (id !== null && id !== untracked(() => this.bien()?.id)) untracked(() => this.chargerBien(id));
    });
  }

  private chargerBien(id: number): void {
    this.chargementBien.set(true);
    this.bienService.getPrive(id).subscribe({
      next: b => {
        this.bien.set(b);
        this.chargementBien.set(false);
      },
      // Hors ligne : onglets sans le titre du logement
      error: () => this.chargementBien.set(false),
    });
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(false);
    this.quittanceService.getMesQuittances().subscribe({
      next: q => {
        this.quittances.set(q);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set(true);
      },
    });
  }
}
