import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { BienService } from '../../services/bien.service';
import { DemandeLocationService } from '../../services/demande-location.service';
import { BienDTO, UserDTO } from '../../models/bien.model';
import { DemandeLocation, echeance, statutDemande } from '../../models/demande-location.model';
import { LocationService } from '../../services/location.service';
import { finDeReservation } from '../../models/location.model';
import { messageErreurApi } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/ui/toast.service';
import { DateLonguePipe } from '../../../../shared/format';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { SheetComponent } from '../../../../shared/ui/sheet.component';
import { AvatarComponent } from '../../../../shared/ui/avatar.component';
import { StatutComponent } from '../../../../shared/ui/statut.component';
import { VideComponent } from '../../../../shared/ui/vide.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { BoutonWhatsappComponent } from '../../../gestion-logement/components/bouton-whatsapp/bouton-whatsapp.component';

/**
 * Proposer la location à une personne qui a écrit au propriétaire au sujet de ce bien (72 h pour accepter ; une
 * seule demande en attente par bien). Acceptée, la demande réserve le bien 14 jours ; le candidat devient
 * locataire en signant le bail. Le propriétaire peut retirer la réservation avant la signature.
 */
@Component({
  selector: 'app-assign-tenant',
  standalone: true,
  imports: [RouterLink, DateLonguePipe, PageHeaderComponent, SheetComponent, AvatarComponent, StatutComponent,
    VideComponent, IconComponent, BoutonWhatsappComponent],
  template: `
    <div class="kp-page kp-page--etroite">
      <kp-page-header titre="Proposer la location" [sousTitre]="bien()?.titre" [retour]="['/biens', id()]" />

      @if (bien()?.locataire; as l) {
        <kp-vide icone="house" titre="Ce bien est déjà loué"
                 [texte]="l.firstName + ' ' + l.lastName + ' en est le locataire.'">
          <a class="kp-btn kp-btn--secondary" [routerLink]="['/biens', id()]">Retour au bien</a>
        </kp-vide>
      } @else if (bien()?.reservation; as r) {
        <section class="kp-card attente" aria-labelledby="titre-reservation">
          <div class="kp-row kp-row--between entete">
            <h2 id="titre-reservation" class="kp-section-title">Logement réservé</h2>
            <span class="kp-statut kp-statut--attention">Réservé</span>
          </div>
          <div class="kp-row reserve">
            <kp-avatar [photo]="r.locataire.urlProfile" [nom]="r.locataire.firstName + ' ' + r.locataire.lastName" />
            <p>
              <strong>{{ r.locataire.firstName }} {{ r.locataire.lastName }}</strong> a accepté. Le logement lui est
              réservé jusqu’au {{ finDeReservation(r.dateExpiration) }} : il deviendra votre locataire en signant
              le bail. Sans bail signé d’ici là, la réservation prend fin.
            </p>
          </div>
          <div class="kp-stack kp-stack--sm">
            <a class="kp-btn kp-btn--primary kp-btn--block" [routerLink]="['/biens', id(), 'bail']">
              <kp-icon name="file-text" [size]="18" /> Préparer et signer le bail
            </a>
            <button type="button" class="kp-btn kp-btn--secondary kp-btn--block" (click)="reservationARetirer.set(true)">
              Retirer la réservation
            </button>
          </div>
        </section>
      } @else {
        @if (enAttente(); as d) {
          <section class="kp-card attente" aria-labelledby="titre-attente">
            <div class="kp-row kp-row--between entete">
              <h2 id="titre-attente" class="kp-section-title">Demande envoyée</h2>
              <kp-statut [statut]="statut(d)" />
            </div>
            <p>
              <strong>{{ d.nomLocataire }}</strong> a jusqu’au {{ echeance(d.dateExpiration) }} pour accepter.
              S’il accepte, le logement lui sera réservé jusqu’à la signature du bail.
            </p>
            <div class="kp-stack kp-stack--sm">
              <kp-bouton-whatsapp type="demande" [documentId]="d.id" [pays]="d.pays"
                                  libelle="Prévenir par WhatsApp"
                                  aideSansNumero="Choisissez le contact dans WhatsApp." />
              <button type="button" class="kp-btn kp-btn--secondary kp-btn--block" (click)="aRetirer.set(d)">
                Retirer la demande
              </button>
            </div>
          </section>
        }

        <p class="kp-muted intro">
          @if (enAttente()) {
            Retirez la demande en cours pour proposer le logement à quelqu’un d’autre.
          } @else {
            Choisissez parmi les personnes qui vous ont écrit au sujet de ce bien. Elles recevront une demande
            à accepter.
          }
        </p>

        <label class="recherche">
          <kp-icon name="search" [size]="18" />
          <span class="kp-sr-only">Rechercher par nom</span>
          <input class="kp-input" type="search" placeholder="Rechercher par nom" (input)="saisie.next($any($event.target).value)" />
        </label>

        @if (recherche()) {
          <div class="kp-stack kp-stack--sm" aria-busy="true">
            <span class="kp-skeleton kp-skeleton--carte"></span>
            <span class="kp-skeleton kp-skeleton--carte"></span>
          </div>
        } @else if (erreur()) {
          <kp-vide icone="wifi-off" titre="Recherche impossible" [texte]="erreur()">
            <button type="button" class="kp-btn kp-btn--secondary" (click)="chercher('')">Réessayer</button>
          </kp-vide>
        } @else if (!candidats().length) {
          <kp-vide icone="message-circle" titre="Personne pour l’instant"
                   texte="Quand quelqu’un vous écrira depuis l’annonce, vous pourrez lui proposer le logement ici.">
            <a class="kp-btn kp-btn--secondary" [routerLink]="['/annonces', id()]">Voir l’annonce</a>
          </kp-vide>
        } @else {
          <ul class="kp-list">
            @for (c of candidats(); track c.id) {
              <li>
                <button type="button" class="kp-list__item" (click)="aConfirmer.set(c)" [disabled]="!!enAttente()">
                  <kp-avatar [photo]="c.urlProfile" [nom]="c.firstName + ' ' + c.lastName" />
                  <span class="kp-list__body">
                    <span class="kp-list__title">{{ c.firstName }} {{ c.lastName }}</span>
                    @if (derniereReponse(c.id); as d) {
                      <span class="kp-list__sub">Demande du {{ d.dateCreation | dateLongue: true }} : {{ statut(d).libelle.toLowerCase() }}</span>
                    }
                  </span>
                </button>
              </li>
            }
          </ul>
        }
      }
    </div>

    <kp-sheet [ouvert]="!!aConfirmer()" (ouvertChange)="!$event && aConfirmer.set(null)" titre="Proposer la location">
      @if (aConfirmer(); as c) {
        <div class="kp-row confirmation">
          <kp-avatar [photo]="c.urlProfile" [nom]="c.firstName + ' ' + c.lastName" [taille]="56" />
          <p>
            <strong>{{ c.firstName }} {{ c.lastName }}</strong> recevra une notification et un e-mail, et aura
            72 heures pour accepter « {{ bien()?.titre }} ». S’il accepte, le logement lui est réservé 14 jours :
            il en devient locataire en signant le bail.
          </p>
        </div>
      }
      <div pied>
        <button type="button" class="kp-btn kp-btn--secondary" (click)="aConfirmer.set(null)">Annuler</button>
        <button type="button" class="kp-btn kp-btn--primary" (click)="envoyer()" [disabled]="envoi()">
          @if (envoi()) {
            <span class="kp-spinner"></span>
          }
          Envoyer la demande
        </button>
      </div>
    </kp-sheet>

    <kp-sheet [(ouvert)]="reservationARetirer" titre="Retirer la réservation">
      @if (bien()?.reservation; as r) {
        <p>
          {{ r.locataire.firstName }} {{ r.locataire.lastName }} sera prévenu. Le bail non signé sera annulé et
          le logement reviendra dans les annonces.
        </p>
      }
      <div pied>
        <button type="button" class="kp-btn kp-btn--secondary" (click)="reservationARetirer.set(false)">Garder</button>
        <button type="button" class="kp-btn kp-btn--danger" (click)="retirerReservation()" [disabled]="envoi()">
          @if (envoi()) {
            <span class="kp-spinner"></span>
          }
          Retirer
        </button>
      </div>
    </kp-sheet>

    <kp-sheet [ouvert]="!!aRetirer()" (ouvertChange)="!$event && aRetirer.set(null)" titre="Retirer la demande">
      @if (aRetirer(); as d) {
        <p>{{ d.nomLocataire }} sera prévenu que la demande est retirée et ne pourra plus l’accepter.</p>
      }
      <div pied>
        <button type="button" class="kp-btn kp-btn--secondary" (click)="aRetirer.set(null)">Garder</button>
        <button type="button" class="kp-btn kp-btn--danger" (click)="retirer()" [disabled]="envoi()">
          @if (envoi()) {
            <span class="kp-spinner"></span>
          }
          Retirer
        </button>
      </div>
    </kp-sheet>
  `,
  styles: [`
    .attente { margin-bottom: 20px; }
    .attente .entete { align-items: center; margin-bottom: 8px; }
    .attente p { margin-bottom: 12px; }
    .intro { margin-bottom: 16px; }
    .recherche { position: relative; display: flex; align-items: center; margin-bottom: 16px; }
    .recherche kp-icon { position: absolute; left: 14px; color: var(--kp-text-subtle); pointer-events: none; }
    .recherche .kp-input { padding-left: 42px; }
    ul { list-style: none; }
    .confirmation, .reserve { align-items: flex-start; }
    .reserve { margin-bottom: 12px; }
  `],
})
export class AssignTenantComponent implements OnInit {
  readonly id = input.required<string>();

  private bienService = inject(BienService);
  private demandes = inject(DemandeLocationService);
  private locations = inject(LocationService);
  private toasts = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  readonly bien = signal<BienDTO | null>(null);
  readonly candidats = signal<UserDTO[]>([]);
  readonly historique = signal<DemandeLocation[]>([]);
  readonly recherche = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly aConfirmer = signal<UserDTO | null>(null);
  readonly aRetirer = signal<DemandeLocation | null>(null);
  readonly reservationARetirer = signal(false);
  readonly envoi = signal(false);
  readonly saisie = new Subject<string>();

  /** Demande encore en attente (une seule par bien). */
  readonly enAttente = computed(() => this.historique().find(d => d.statut === 'EN_ATTENTE') ?? null);

  protected readonly statut = (d: DemandeLocation) => statutDemande(d.statut);
  protected readonly echeance = echeance;
  protected readonly finDeReservation = finDeReservation;

  ngOnInit(): void {
    this.chargerBien();
    this.chargerDemandes();
    this.chercher('');
    this.saisie.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(v => this.chercher(v));
  }

  /** Dernière demande terminée envoyée à ce candidat (refusée, expirée, retirée). */
  derniereReponse(locataireId: number): DemandeLocation | null {
    return this.historique().find(d => d.locataireId === locataireId && d.statut !== 'EN_ATTENTE') ?? null;
  }

  chercher(texte: string): void {
    const [prenom, nom] = texte.trim().split(/\s+/);
    this.recherche.set(true);
    this.erreur.set(null);
    this.bienService.rechercheLocataire(Number(this.id()), {
      firstName: prenom || undefined, lastName: nom || undefined, page: 0, size: 20,
    }).subscribe({
      next: page => {
        this.candidats.set(page.contenu);
        this.recherche.set(false);
      },
      error: err => {
        this.recherche.set(false);
        this.erreur.set(messageErreurApi(err, 'Vérifiez votre connexion puis réessayez.'));
      },
    });
  }

  envoyer(): void {
    const c = this.aConfirmer();
    if (!c) return;
    this.envoi.set(true);
    this.demandes.envoyer(Number(this.id()), c.id).subscribe({
      next: demande => {
        this.envoi.set(false);
        this.aConfirmer.set(null);
        this.historique.update(h => [demande, ...h]);
        this.toasts.ok(`Demande envoyée à ${c.firstName} ${c.lastName}.`);
      },
      error: (err: HttpErrorResponse) => {
        this.envoi.set(false);
        this.aConfirmer.set(null);
        // 404 : seuls les candidats qui ont écrit au sujet de ce bien ; 409 : bien loué, archivé ou demande en cours
        this.toasts.erreur(err.status === 404
          ? 'Cette personne doit d’abord vous avoir écrit au sujet de ce bien.'
          : messageErreurApi(err, 'La demande n’a pas pu être envoyée.'));
        this.chargerDemandes();
        this.chargerBien();
      },
    });
  }

  retirer(): void {
    const d = this.aRetirer();
    if (!d) return;
    this.envoi.set(true);
    this.demandes.annuler(d.id).subscribe({
      next: () => {
        this.envoi.set(false);
        this.aRetirer.set(null);
        this.toasts.ok('Demande retirée.');
        this.chargerDemandes();
      },
      error: (err: HttpErrorResponse) => {
        this.envoi.set(false);
        this.aRetirer.set(null);
        this.toasts.erreur(messageErreurApi(err, 'La demande n’a pas pu être retirée.'));
        this.chargerDemandes();
      },
    });
  }

  /** Le candidat est prévenu ; son bail non signé est annulé ; le bien redevient libre. */
  retirerReservation(): void {
    const r = this.bien()?.reservation;
    if (!r) return;
    this.envoi.set(true);
    this.locations.annuler(r.id).subscribe({
      next: () => {
        this.envoi.set(false);
        this.reservationARetirer.set(false);
        this.toasts.ok('Réservation retirée. Le logement est de nouveau en ligne.');
        this.chargerBien();
        this.chargerDemandes();
      },
      error: (err: HttpErrorResponse) => {
        this.envoi.set(false);
        this.reservationARetirer.set(false);
        this.toasts.erreur(messageErreurApi(err, 'La réservation n’a pas pu être retirée.'));
        this.chargerBien();
      },
    });
  }

  private chargerBien(): void {
    this.bienService.getPrive(Number(this.id())).subscribe({ next: b => this.bien.set(b), error: () => undefined });
  }

  private chargerDemandes(): void {
    this.demandes.duBien(Number(this.id())).subscribe({
      next: h => this.historique.set(h),
      error: () => undefined,
    });
  }
}
