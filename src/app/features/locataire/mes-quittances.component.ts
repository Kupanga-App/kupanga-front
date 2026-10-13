import { Component, OnInit, inject, signal } from '@angular/core';
import { QuittanceService } from '../gestion-logement/services/quittance.service';
import { LIBELLES_MODE_PAIEMENT, QuittanceDTO } from '../gestion-logement/models/quittance.model';
import { MontantPipe } from '../../core/money/montant';
import { DateLonguePipe, moisAnnee, statutQuittance } from '../../shared/format';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { StatutComponent } from '../../shared/ui/statut.component';
import { VideComponent } from '../../shared/ui/vide.component';
import { TirerPourActualiserDirective } from '../../shared/ui/tirer-pour-actualiser.directive';
import { IconComponent } from '../../shared/components/icon/icon.component';

/** Quittances du locataire : statut de chaque loyer, PDF de la quittance une fois le loyer déclaré reçu. */
@Component({
  selector: 'kp-mes-quittances',
  standalone: true,
  imports: [MontantPipe, DateLonguePipe, PageHeaderComponent, StatutComponent, VideComponent, TirerPourActualiserDirective, IconComponent],
  template: `
    <div class="kp-page kp-page--etroite" kpTirerPourActualiser (actualiser)="charger()">
      <kp-page-header titre="Mes quittances" />

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
        <ul class="kp-list">
          @for (q of quittances(); track q.id) {
            <li class="kp-list__item ligne">
              <span class="kp-list__body">
                <span class="kp-list__title mois">{{ mois(q) }}</span>
                <span class="kp-list__sub">
                  {{ q.montantTotal | montant: q.devise }} ·
                  @if (q.statut === 'PAYEE') {
                    reçu le {{ q.datePaiement | dateLongue }}{{ q.modePaiement ? ' (' + libellesMode[q.modePaiement] + ')' : '' }}
                  } @else {
                    échéance le {{ q.dateEcheance | dateLongue }}
                  }
                </span>
                @if (q.urlPdf || q.urlRecu) {
                  <span class="actions">
                    @if (q.urlPdf && q.statut === 'PAYEE') {
                      <a class="kp-btn kp-btn--secondary kp-btn--sm" [href]="q.urlPdf" target="_blank" rel="noopener"><kp-icon name="download" [size]="18" /> Quittance</a>
                    }
                    @if (q.urlRecu) {
                      <a class="kp-btn kp-btn--ghost kp-btn--sm" [href]="q.urlRecu" target="_blank" rel="noopener"><kp-icon name="image" [size]="18" /> Reçu</a>
                    }
                  </span>
                }
              </span>
              <kp-statut [statut]="statut(q)" />
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .ligne { align-items: flex-start; }
    .mois::first-letter { text-transform: uppercase; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  `],
})
export class MesQuittancesComponent implements OnInit {
  private quittanceService = inject(QuittanceService);

  readonly quittances = signal<QuittanceDTO[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal(false);
  readonly libellesMode = LIBELLES_MODE_PAIEMENT;
  readonly statut = (q: QuittanceDTO) => statutQuittance(q.statut);
  readonly mois = (q: QuittanceDTO) => moisAnnee(q.mois, q.annee);

  ngOnInit(): void {
    this.charger();
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
