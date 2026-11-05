import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DemandeLocationService } from '../biens/services/demande-location.service';
import { DemandeLocation, echeance } from '../biens/models/demande-location.model';
import { LocationService } from '../biens/services/location.service';
import { Location, finDeReservation } from '../biens/models/location.model';
import { forkJoin } from 'rxjs';
import { messageErreurApi } from '../../core/http/api-error';
import { ToastService } from '../../core/ui/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SheetComponent } from '../../shared/ui/sheet.component';
import { VideComponent } from '../../shared/ui/vide.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * Demandes de location reçues et logements réservés (décision du 2026-11-05) : accepter réserve le logement ;
 * on en devient locataire en signant le bail, et on peut se désister avant. Page `/demandes-location` (lien de
 * l'e-mail et de la notification) ou bloc intégré à « Mon logement » (`integre`, rien d'affiché sans demande ni
 * réservation).
 */
@Component({
  selector: 'kp-demandes-recues',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, PageHeaderComponent, SheetComponent, VideComponent, IconComponent],
  template: `
    @if (!integre()) {
      <div class="kp-page kp-page--etroite">
        <kp-page-header titre="Demandes de location" [retour]="['/mon-logement']" />
        <ng-container *ngTemplateOutlet="liste" />
      </div>
    } @else if (demandes().length || reservations().length) {
      <section class="integre" aria-label="Demandes de location">
        <ng-container *ngTemplateOutlet="liste" />
      </section>
    }

    <ng-template #liste>
      @if (chargement() && !integre()) {
        <div class="kp-stack kp-stack--sm" aria-busy="true">
          <span class="kp-skeleton kp-skeleton--carte"></span>
        </div>
      } @else if (erreur() && !integre()) {
        <kp-vide icone="wifi-off" titre="Demandes indisponibles" texte="Vérifiez votre connexion puis réessayez.">
          <button type="button" class="kp-btn kp-btn--secondary" (click)="charger()">Réessayer</button>
        </kp-vide>
      } @else if (!demandes().length && !reservations().length && !integre()) {
        <kp-vide icone="house" titre="Aucune demande en attente"
                 texte="Quand un propriétaire vous proposera son logement, sa demande apparaîtra ici.">
          <a routerLink="/explorer" class="kp-btn kp-btn--primary"><kp-icon name="compass" /> Voir les annonces</a>
        </kp-vide>
      } @else {
        <div class="kp-stack">
          @for (r of reservations(); track r.id) {
            <article class="kp-card demande">
              <div class="kp-row kp-row--between">
                <p class="kp-muted surtitre">Logement réservé pour vous</p>
                <span class="kp-statut kp-statut--attention">Réservé</span>
              </div>
              <h2 class="kp-section-title">{{ r.titreBien }}</h2>
              <p>{{ r.adresseBien }}</p>
              <p>
                <strong>{{ r.nomProprietaire }}</strong> prépare le bail. Vous recevrez un lien par e-mail et dans
                vos notifications pour le signer : vous deviendrez alors locataire de ce logement.
              </p>
              <p class="kp-muted">Réservé jusqu’au {{ finDeReservation(r.dateExpiration) }}. Sans bail signé d’ici là, la réservation prend fin.</p>
              <div class="kp-row actions">
                <button type="button" class="kp-btn kp-btn--secondary" (click)="aDesister.set(r)" [disabled]="envoi()">
                  Se désister
                </button>
                <a routerLink="/notifications" class="kp-btn kp-btn--primary"><kp-icon name="bell" [size]="18" /> Notifications</a>
              </div>
            </article>
          }
          @for (d of demandes(); track d.id) {
            <article class="kp-card demande">
              <p class="kp-muted surtitre">Demande de location</p>
              <h2 class="kp-section-title">{{ d.titreBien }}</h2>
              <p>{{ d.adresseBien }}</p>
              <p><strong>{{ d.nomProprietaire }}</strong> vous propose de devenir locataire de ce logement.</p>
              <p class="kp-muted">Répondez avant le {{ echeance(d.dateExpiration) }}.</p>
              <div class="kp-row actions">
                <button type="button" class="kp-btn kp-btn--secondary" (click)="aRefuser.set(d)" [disabled]="envoi()">
                  Refuser
                </button>
                <button type="button" class="kp-btn kp-btn--primary" (click)="accepter(d)" [disabled]="envoi()">
                  @if (envoi() === d.id) {
                    <span class="kp-spinner"></span>
                  }
                  Accepter
                </button>
              </div>
            </article>
          }
        </div>
      }
    </ng-template>

    <kp-sheet [ouvert]="!!aDesister()" (ouvertChange)="!$event && aDesister.set(null)" titre="Se désister">
      @if (aDesister(); as r) {
        <p>
          Vous renoncez à « {{ r.titreBien }} ». {{ r.nomProprietaire }} sera prévenu et le bail non signé sera
          annulé. Ce choix est définitif : pour revenir, il faudrait une nouvelle demande du propriétaire.
        </p>
      }
      <div pied>
        <button type="button" class="kp-btn kp-btn--secondary" (click)="aDesister.set(null)">Garder le logement</button>
        <button type="button" class="kp-btn kp-btn--danger" (click)="desister()" [disabled]="envoi()">Se désister</button>
      </div>
    </kp-sheet>

    <kp-sheet [ouvert]="!!aRefuser()" (ouvertChange)="!$event && aRefuser.set(null)" titre="Refuser la demande">
      @if (aRefuser(); as d) {
        <p>{{ d.nomProprietaire }} sera prévenu que vous refusez « {{ d.titreBien }} ».</p>
      }
      <div pied>
        <button type="button" class="kp-btn kp-btn--secondary" (click)="aRefuser.set(null)">Annuler</button>
        <button type="button" class="kp-btn kp-btn--danger" (click)="refuser()" [disabled]="envoi()">Refuser</button>
      </div>
    </kp-sheet>
  `,
  styles: [`
    .integre { margin-bottom: 20px; }
    .demande p { margin-bottom: 8px; }
    .surtitre { font-size: 0.85rem; margin-bottom: 2px; }
    .actions { justify-content: flex-end; gap: 8px; margin-top: 12px; }
  `],
})
export class DemandesRecuesComponent implements OnInit {
  /** Bloc intégré à une autre page : pas d'en-tête, rien sans demande. */
  readonly integre = input(false);
  /** Émis après une acceptation (le logement vient d'être réservé). */
  readonly acceptee = output<DemandeLocation>();

  private service = inject(DemandeLocationService);
  private locations = inject(LocationService);
  private toasts = inject(ToastService);

  readonly demandes = signal<DemandeLocation[]>([]);
  readonly reservations = signal<Location[]>([]);
  readonly aDesister = signal<Location | null>(null);
  readonly chargement = signal(true);
  readonly erreur = signal(false);
  /** Id de la demande en cours de réponse. */
  readonly envoi = signal<number | null>(null);
  readonly aRefuser = signal<DemandeLocation | null>(null);

  protected readonly echeance = echeance;
  protected readonly finDeReservation = finDeReservation;

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(false);
    forkJoin({ demandes: this.service.recues(), reservations: this.locations.mesReservations() }).subscribe({
      next: ({ demandes, reservations }) => {
        this.demandes.set(demandes);
        this.reservations.set(reservations);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set(true);
      },
    });
  }

  accepter(d: DemandeLocation): void {
    this.envoi.set(d.id);
    this.service.accepter(d.id).subscribe({
      next: acceptee => {
        this.envoi.set(null);
        this.toasts.ok(`« ${d.titreBien} » vous est réservé. Vous en deviendrez locataire en signant le bail.`);
        this.acceptee.emit(acceptee);
        this.charger();
      },
      error: (err: HttpErrorResponse) => this.echec(err, 'La demande n’a pas pu être acceptée.'),
    });
  }

  refuser(): void {
    const d = this.aRefuser();
    if (!d) return;
    this.envoi.set(d.id);
    this.service.refuser(d.id).subscribe({
      next: () => {
        this.envoi.set(null);
        this.aRefuser.set(null);
        this.demandes.update(l => l.filter(x => x.id !== d.id));
        this.toasts.ok('Demande refusée.');
      },
      error: (err: HttpErrorResponse) => this.echec(err, 'La demande n’a pas pu être refusée.'),
    });
  }

  desister(): void {
    const r = this.aDesister();
    if (!r) return;
    this.envoi.set(r.id);
    this.locations.desister(r.id).subscribe({
      next: () => {
        this.envoi.set(null);
        this.aDesister.set(null);
        this.reservations.update(l => l.filter(x => x.id !== r.id));
        this.toasts.ok('Désistement enregistré. Le propriétaire est prévenu.');
      },
      error: (err: HttpErrorResponse) => {
        this.aDesister.set(null);
        this.echec(err, 'Le désistement n’a pas pu être enregistré.');
      },
    });
  }

  /** 410 : expirée ; 409 : déjà traitée ou logement plus disponible ; la liste est relue. */
  private echec(err: HttpErrorResponse, defaut: string): void {
    this.envoi.set(null);
    this.aRefuser.set(null);
    this.toasts.erreur(messageErreurApi(err, defaut));
    this.charger();
  }
}
