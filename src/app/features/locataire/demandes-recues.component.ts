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
import { EtapeFrise, FriseComponent } from '../../shared/ui/frise.component';
import { CompteARebours, compteARebours } from './compte-a-rebours';
import { calculerEtapesLocataire } from './etapes-locataire';
import { nomCourt } from './nom-court';

/**
 * Demandes de location reçues et logements réservés (décision du 2026-11-05) : accepter réserve le logement ;
 * on en devient locataire en signant le bail, et on peut se désister avant. Page `/demandes-location` (lien de
 * l'e-mail et de la notification) ou bloc intégré à « Mon logement » (`integre`, rien d'affiché sans demande ni
 * réservation).
 */
@Component({
  selector: 'kp-demandes-recues',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, PageHeaderComponent, SheetComponent, VideComponent, IconComponent, FriseComponent],
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
            <!-- Logement réservé (maquette Mon-Logement-Reserve) : compte à rebours lu dans dateExpiration -->
            <article class="kp-card reserve" [attr.aria-labelledby]="'reserve-' + r.id">
              <div class="reserve__haut">
                <span class="vignette" aria-hidden="true"><kp-icon name="house" [size]="24" [strokeWidth]="1.5" /></span>
                <div class="reserve__texte">
                  <span class="surtitre">Logement réservé pour vous</span>
                  <h2 [id]="'reserve-' + r.id">{{ r.titreBien }}</h2>
                  <p class="secondaire">{{ r.adresseBien }}</p>
                </div>
                <div class="reserve__actions">
                  <a routerLink="/notifications" class="kp-btn kp-btn--secondary kp-btn--sm"><kp-icon name="bell" [size]="16" /> Notifications</a>
                  <button type="button" class="kp-btn kp-btn--ghost kp-btn--sm" (click)="aDesister.set(r)" [disabled]="envoi()">
                    Se désister
                  </button>
                </div>
              </div>
              @if (rebours(r); as c) {
                <div class="rebours">
                  <div class="rebours__ligne">
                    <span class="fort">Réservé jusqu’au {{ finDeReservation(r.dateExpiration) }}</span>
                    <span class="petit kp-tabulaire">
                      @if (c.joursRestants > 0) {
                        J-{{ c.joursRestants }} · il reste {{ c.joursRestants }} jour{{ c.joursRestants > 1 ? 's' : '' }}
                      } @else {
                        Dernier jour
                      }
                    </span>
                  </div>
                  <span class="barre" role="progressbar" aria-label="Temps de réservation écoulé"
                        [attr.aria-valuenow]="Math.round(c.progression * 100)" aria-valuemin="0" aria-valuemax="100">
                    <span [style.width.%]="c.progression * 100"></span>
                  </span>
                </div>
              }
              <p class="prochaine">
                <kp-icon name="file-text" [size]="18" [strokeWidth]="1.5" />
                <span>
                  <strong>Prochaine étape : {{ r.nomProprietaire }} prépare le bail.</strong> Vous recevrez un lien par e-mail
                  et dans vos notifications pour le signer : vous deviendrez alors locataire de ce logement. Sans bail
                  signé d’ici là, la réservation prend fin.
                </span>
              </p>
            </article>
            <section class="kp-card" [attr.aria-labelledby]="'frise-' + r.id">
              <h2 class="titre-carte" [id]="'frise-' + r.id">Où en est votre location</h2>
              <kp-frise titre="Où en est votre location" [etapes]="etapesReservation(r)" />
            </section>
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
    .integre { margin-bottom: clamp(8px, 0.8vw, 12px); }
    .surtitre, .petit { color: var(--kp-text-subtle); font-size: var(--kp-fs-secondary); }
    .secondaire { color: var(--kp-text-muted); font-size: 14px; }
    .fort { font-weight: 500; }
    .titre-carte { font-size: var(--kp-fs-body); font-weight: 500; }
    .reserve { gap: var(--kp-space-4); }
    .reserve__haut { display: flex; flex-wrap: wrap; align-items: center; gap: var(--kp-space-4); }
    .vignette {
      display: grid; place-items: center; flex: none; width: 96px; height: 72px; border-radius: var(--kp-radius-md);
      background: var(--kp-accent-soft); color: var(--kp-accent);
    }
    .reserve__texte { display: flex; flex: 1 1 260px; flex-direction: column; gap: 2px; min-width: 0; }
    .reserve__texte h2 { font-size: var(--kp-fs-subtitle); font-weight: 500; }
    .reserve__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }
    .rebours { display: flex; flex-direction: column; gap: 8px; }
    .rebours__ligne { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; font-size: 14px; }
    .barre { display: block; height: 8px; border-radius: var(--kp-radius-pill); background: var(--kp-segment-bg); overflow: hidden; }
    .barre > span { display: block; height: 100%; min-width: 8px; border-radius: inherit; background: var(--kp-accent); }
    .prochaine {
      display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-radius: var(--kp-radius-md);
      background: var(--kp-bg); color: var(--kp-text-muted); font-size: 14px;
    }
    .prochaine kp-icon { margin-top: 1px; color: var(--kp-text); }
    .prochaine strong { color: var(--kp-text); font-weight: 500; }
    .demande p { margin-bottom: 8px; }
    .actions { justify-content: flex-end; gap: 8px; margin-top: 12px; }
  `],
})
export class DemandesRecuesComponent implements OnInit {
  /** Bloc intégré à une autre page : pas d'en-tête, rien sans demande. */
  readonly integre = input(false);
  /** Émis après une acceptation (le logement vient d'être réservé). */
  readonly acceptee = output<DemandeLocation>();
  /** Émis à chaque lecture : nombre de demandes et de réservations affichées. */
  readonly contenu = output<{ demandes: number; reservations: number }>();

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
  protected readonly Math = Math;

  /** Jours restants et part écoulée, calculés à l'écran à partir de `dateExpiration`. */
  rebours(r: Location): CompteARebours | null {
    return compteARebours(r.dateReservation, r.dateExpiration);
  }

  /** Frise du logement réservé : demande acceptée, bail préparé par le propriétaire. */
  etapesReservation(r: Location): EtapeFrise[] {
    return calculerEtapesLocataire({
      reserve: true, proprietaire: nomCourt(r.nomProprietaire), baux: [], bailSigne: null, invitationsBail: [],
      etatsDesLieux: [], nombreQuittances: 0,
    }).etapes;
  }

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
        this.contenu.emit({ demandes: demandes.length, reservations: reservations.length });
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
