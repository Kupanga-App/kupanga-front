import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { BienService } from '../../biens/services/bien.service';
import { EdlService } from '../../gestion-logement/services/edl.service';
import { BienDTO } from '../../biens/models/bien.model';
import { EtatDesLieuxDTO } from '../../gestion-logement/models/edl.model';
import { messageErreurApi } from '../../../core/http/api-error';
import { ToastService } from '../../../core/ui/toast.service';
import { DateLonguePipe, statutSignature } from '../../../shared/format';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatutComponent } from '../../../shared/ui/statut.component';
import { VideComponent } from '../../../shared/ui/vide.component';
import { FeuilleSignatureComponent } from '../../../shared/ui/feuille-signature.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { BoutonWhatsappComponent } from '../../gestion-logement/components/bouton-whatsapp/bouton-whatsapp.component';

/** États des lieux d'un bien : signature du propriétaire, relance du locataire, WhatsApp, PDF. */
@Component({
  selector: 'kp-etats-des-lieux',
  standalone: true,
  imports: [RouterLink, DateLonguePipe, PageHeaderComponent, StatutComponent, VideComponent, FeuilleSignatureComponent, IconComponent, BoutonWhatsappComponent],
  template: `
    <div class="kp-page kp-page--etroite">
      <kp-page-header titre="États des lieux" [sousTitre]="bien()?.titre" [retour]="['/biens', id()]">
        @if (bien()?.locataire && !bien()?.archive) {
          <a actions class="kp-btn kp-btn--primary kp-btn--sm" [routerLink]="['/biens', id(), 'etats-des-lieux', 'nouveau']">
            <kp-icon name="plus" [size]="18" /> Nouveau
          </a>
        }
      </kp-page-header>

      @if (chargement() && !bien()) {
        <div class="kp-stack" aria-busy="true">
          <span class="kp-skeleton kp-skeleton--carte"></span>
          <span class="kp-skeleton kp-skeleton--carte"></span>
        </div>
      } @else if (erreur()) {
        <kp-vide icone="wifi-off" titre="États des lieux indisponibles" texte="Vérifiez votre connexion puis réessayez.">
          <button type="button" class="kp-btn kp-btn--secondary" (click)="charger()">Réessayer</button>
        </kp-vide>
      } @else if (!edls().length) {
        <kp-vide icone="clipboard-check" titre="Aucun état des lieux"
                 [texte]="bien()?.locataire ? 'Faites l’état des lieux d’entrée avec votre locataire, pièce par pièce.' : 'Choisissez d’abord le locataire de ce bien.'">
          @if (bien()?.locataire && !bien()?.archive) {
            <a class="kp-btn kp-btn--primary" [routerLink]="['/biens', id(), 'etats-des-lieux', 'nouveau']">Commencer</a>
          }
        </kp-vide>
      } @else {
        <ul class="kp-stack edls">
          @for (e of edls(); track e.id) {
            <li class="kp-card">
              <div class="kp-row kp-row--between">
                <h2>État des lieux {{ e.type === 'ENTREE' ? 'd’entrée' : 'de sortie' }}</h2>
                <kp-statut [statut]="statut(e)" />
              </div>
              <p class="kp-muted kp-small">
                Réalisé le {{ e.dateRealisation | dateLongue }} · {{ e.pieces.length }} pièce{{ e.pieces.length > 1 ? 's' : '' }}
                @if (e.nomLocataire) { · {{ e.nomLocataire }} }
              </p>
              <div class="kp-actions">
                @if (!bien()?.archive && e.statut === 'EN_ATTENTE_SIGNATURE_PROPRIO') {
                  <button type="button" class="kp-btn kp-btn--primary" (click)="ouvrir(e, false)"><kp-icon name="pen-line" [size]="18" /> Signer</button>
                }
                @if (!bien()?.archive && (e.statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE' || e.statut === 'EXPIRE')) {
                  <button type="button" class="kp-btn kp-btn--secondary" (click)="ouvrir(e, true)"><kp-icon name="refresh-cw" [size]="18" /> Renvoyer le lien</button>
                }
                @if (e.urlPdf) {
                  <a class="kp-btn kp-btn--secondary" [href]="e.urlPdf" target="_blank" rel="noopener"><kp-icon name="download" [size]="18" /> PDF</a>
                }
              </div>
              @if (e.statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE' && bien()?.pays) {
                <kp-bouton-whatsapp type="edl" [documentId]="e.id" [pays]="bien()!.pays" libelle="Prévenir par WhatsApp" />
              }
            </li>
          }
        </ul>
      }
    </div>

    <kp-feuille-signature
      [(ouvert)]="signatureOuverte"
      [titre]="relance() ? 'Renvoyer le lien' : 'Signer l’état des lieux'"
      [texte]="relance() ? 'Signez de nouveau : un nouveau lien part au locataire et l’ancien ne fonctionne plus.' : 'Vous confirmez l’état du logement décrit dans le document.'"
      [libelle]="relance() ? 'Signer et renvoyer' : 'Signer'"
      [enCours]="signatureEnCours()"
      [erreur]="erreurSignature()"
      (valider)="signer($event)" />
  `,
  styles: [`.edls { margin: 0; padding: 0; list-style: none; } h2 { font-size: var(--kp-fs-md); }`],
})
export class EtatsDesLieuxComponent implements OnInit {
  readonly id = input.required<string>();

  private bienService = inject(BienService);
  private edlService = inject(EdlService);
  private toasts = inject(ToastService);

  readonly bien = signal<BienDTO | null>(null);
  readonly edls = signal<EtatDesLieuxDTO[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal(false);
  readonly signatureOuverte = signal(false);
  readonly signatureEnCours = signal(false);
  readonly erreurSignature = signal<string | null>(null);
  readonly relance = signal(false);
  private aSigner: EtatDesLieuxDTO | null = null;

  readonly statut = (e: EtatDesLieuxDTO) => statutSignature(e.statut, 'proprietaire');

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    const id = Number(this.id());
    this.chargement.set(true);
    this.erreur.set(false);
    forkJoin({ bien: this.bienService.getPrive(id), edls: this.edlService.getByBien(id) }).subscribe({
      next: ({ bien, edls }) => {
        this.bien.set(bien);
        this.edls.set(edls);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set(true);
      },
    });
  }

  ouvrir(e: EtatDesLieuxDTO, relance: boolean): void {
    this.aSigner = e;
    this.relance.set(relance);
    this.erreurSignature.set(null);
    this.signatureOuverte.set(true);
  }

  signer(signature: string): void {
    const edl = this.aSigner;
    if (!edl) return;
    this.signatureEnCours.set(true);
    this.erreurSignature.set(null);
    this.edlService
      .signerProprietaire(edl.id, signature)
      .pipe(switchMap(() => this.edlService.getByBien(Number(this.id()))))
      .subscribe({
        next: edls => {
          this.edls.set(edls);
          this.signatureEnCours.set(false);
          this.signatureOuverte.set(false);
          this.toasts.ok(this.relance() ? 'Nouveau lien envoyé au locataire.' : 'Signé. Le locataire a reçu un lien pour signer.');
        },
        error: err => {
          this.signatureEnCours.set(false);
          this.erreurSignature.set(messageErreurApi(err, 'La signature n’a pas été enregistrée. Réessayez.'));
        },
      });
  }
}
