import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { BienService } from '../../biens/services/bien.service';
import { ContratService } from '../../gestion-logement/services/contrat.service';
import { BienDTO } from '../../biens/models/bien.model';
import { ContratDTO } from '../../gestion-logement/models/contrat.model';
import { MontantPipe } from '../../../core/money/montant';
import { messageErreurApi } from '../../../core/http/api-error';
import { ToastService } from '../../../core/ui/toast.service';
import { DateLonguePipe, statutSignature } from '../../../shared/format';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatutComponent } from '../../../shared/ui/statut.component';
import { VideComponent } from '../../../shared/ui/vide.component';
import { FeuilleSignatureComponent } from '../../../shared/ui/feuille-signature.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { BoutonWhatsappComponent } from '../../gestion-logement/components/bouton-whatsapp/bouton-whatsapp.component';

/**
 * Bail d'un bien : détail du bail en cours, signature du propriétaire, relance du locataire (nouveau lien, B6),
 * invitation WhatsApp (C7-C16), PDF. Les baux précédents restent consultables.
 */
@Component({
  selector: 'kp-bail',
  standalone: true,
  imports: [
    RouterLink, MontantPipe, DateLonguePipe, PageHeaderComponent, StatutComponent, VideComponent,
    FeuilleSignatureComponent, IconComponent, BoutonWhatsappComponent,
  ],
  templateUrl: './bail.component.html',
})
export class BailComponent implements OnInit {
  readonly id = input.required<string>();

  private bienService = inject(BienService);
  private contratService = inject(ContratService);
  private toasts = inject(ToastService);

  readonly bien = signal<BienDTO | null>(null);
  readonly contrats = signal<ContratDTO[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal(false);
  readonly signatureOuverte = signal(false);
  readonly signatureEnCours = signal(false);
  readonly erreurSignature = signal<string | null>(null);

  readonly bail = computed(() => this.contrats()[0] ?? null);
  readonly precedents = computed(() => this.contrats().slice(1));
  readonly statut = computed(() => statutSignature(this.bail()?.statut, 'proprietaire'));
  readonly statutDe = (c: ContratDTO) => statutSignature(c.statut, 'proprietaire');
  readonly nomLocataire = computed(() => {
    const l = this.bail()?.locataire ?? this.bien()?.locataire;
    return l ? `${l.firstName} ${l.lastName}` : '';
  });
  /** B6 : le propriétaire signe d'abord ; il peut re-signer pour renvoyer un lien au locataire (ancien lien invalidé). */
  readonly peutSigner = computed(() => {
    const s = this.bail()?.statut;
    return !this.bien()?.archive && (s === 'EN_ATTENTE_SIGNATURE_PROPRIO' || s === 'BROUILLON');
  });
  readonly peutRelancer = computed(() => {
    const s = this.bail()?.statut;
    return !this.bien()?.archive && (s === 'EN_ATTENTE_SIGNATURE_LOCATAIRE' || s === 'EXPIRE');
  });
  readonly peutCreer = computed(() => {
    const b = this.bien();
    const s = this.bail()?.statut;
    return !!b?.locataire && !b.archive && (!s || s === 'ANNULE' || s === 'EXPIRE');
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    const id = Number(this.id());
    this.chargement.set(true);
    this.erreur.set(false);
    forkJoin({ bien: this.bienService.getPrive(id), contrats: this.contratService.getByBien(id) }).subscribe({
      next: ({ bien, contrats }) => {
        this.bien.set(bien);
        this.contrats.set(contrats);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set(true);
      },
    });
  }

  ouvrirSignature(): void {
    this.erreurSignature.set(null);
    this.signatureOuverte.set(true);
  }

  signer(signature: string): void {
    const bail = this.bail();
    if (!bail) return;
    const relance = this.peutRelancer();
    this.signatureEnCours.set(true);
    this.erreurSignature.set(null);
    this.contratService
      .signerProprio(bail.id, signature)
      .pipe(switchMap(() => this.contratService.getByBien(Number(this.id()))))
      .subscribe({
        next: contrats => {
          this.contrats.set(contrats);
          this.signatureEnCours.set(false);
          this.signatureOuverte.set(false);
          this.toasts.ok(relance ? 'Nouveau lien envoyé au locataire.' : 'Bail signé. Le locataire a reçu un lien pour signer.');
        },
        error: err => {
          this.signatureEnCours.set(false);
          this.erreurSignature.set(messageErreurApi(err, 'La signature n’a pas été enregistrée. Réessayez.'));
        },
      });
  }
}
