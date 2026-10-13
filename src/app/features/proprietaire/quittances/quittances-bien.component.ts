import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { BienService } from '../../biens/services/bien.service';
import { JuridictionService } from '../../biens/services/juridiction.service';
import { QuittanceService } from '../../gestion-logement/services/quittance.service';
import { BienDTO } from '../../biens/models/bien.model';
import { LIBELLES_MODE_PAIEMENT, ModePaiement, QuittanceDTO } from '../../gestion-logement/models/quittance.model';
import { MontantPipe } from '../../../core/money/montant';
import { messageErreurApi } from '../../../core/http/api-error';
import { ACCEPT_PHOTOS, preparerPhoto } from '../../../core/media/photos';
import { ToastService } from '../../../core/ui/toast.service';
import { DateLonguePipe, aujourdhuiIso, de, moisAnnee, statutQuittance } from '../../../shared/format';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { SheetComponent } from '../../../shared/ui/sheet.component';
import { SignatureComponent } from '../../../shared/ui/signature.component';
import { StatutComponent } from '../../../shared/ui/statut.component';
import { VideComponent } from '../../../shared/ui/vide.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { BoutonWhatsappComponent } from '../../gestion-logement/components/bouton-whatsapp/bouton-whatsapp.component';

/**
 * Quittances d'un bien. Aucun paiement ne passe par l'application : le propriétaire déclare le loyer reçu
 * (mode de paiement du pays, date, référence) et peut joindre la photo du reçu (C8-bis).
 */
@Component({
  selector: 'kp-quittances-bien',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, MontantPipe, DateLonguePipe, PageHeaderComponent, SheetComponent, SignatureComponent,
    StatutComponent, VideComponent, IconComponent, BoutonWhatsappComponent,
  ],
  templateUrl: './quittances-bien.component.html',
  styleUrl: './quittances-bien.component.scss',
})
export class QuittancesBienComponent implements OnInit {
  readonly id = input.required<string>();

  private bienService = inject(BienService);
  private juridictions = inject(JuridictionService);
  private quittanceService = inject(QuittanceService);
  private toasts = inject(ToastService);

  readonly bien = signal<BienDTO | null>(null);
  readonly quittances = signal<QuittanceDTO[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal(false);
  readonly modes = signal<ModePaiement[]>([]);
  readonly libellesMode = LIBELLES_MODE_PAIEMENT;
  readonly acceptPhotos = ACCEPT_PHOTOS;
  readonly aujourdhui = aujourdhuiIso();
  readonly envoiRecuId = signal<number | null>(null);

  // Déclaration du loyer reçu
  readonly feuilleOuverte = signal(false);
  readonly aDeclarer = signal<QuittanceDTO | null>(null);
  readonly signature = signal('');
  readonly declarationEnCours = signal(false);
  readonly erreurDeclaration = signal<string | null>(null);
  readonly paiement = new FormGroup({
    modePaiement: new FormControl<ModePaiement | null>(null, Validators.required),
    datePaiement: new FormControl('', { nonNullable: true }),
    referencePaiement: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100), Validators.pattern(/^[\p{L}0-9 .,/#_-]*$/u)],
    }),
  });

  readonly statut = (q: QuittanceDTO) => statutQuittance(q.statut);
  readonly mois = (q: QuittanceDTO) => moisAnnee(q.mois, q.annee);
  readonly titreDeclaration = () => {
    const q = this.aDeclarer();
    return q ? `Loyer ${de(this.mois(q))} reçu` : 'Loyer reçu';
  };

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    const id = Number(this.id());
    this.chargement.set(true);
    this.erreur.set(false);
    forkJoin({ bien: this.bienService.getPrive(id), quittances: this.quittanceService.getByBien(id) }).subscribe({
      next: ({ bien, quittances }) => {
        this.bien.set(bien);
        this.quittances.set(quittances);
        this.chargement.set(false);
        this.juridictions.configuration(bien.pays).pipe(catchError(() => of(null))).subscribe(config => {
          this.modes.set(config?.modesPaiement ?? ['ESPECES', 'VIREMENT', 'AUTRE']);
        });
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set(true);
      },
    });
  }

  private recharger(): void {
    this.quittanceService.getByBien(Number(this.id())).subscribe({ next: q => this.quittances.set(q) });
  }

  declarer(q: QuittanceDTO): void {
    this.aDeclarer.set(q);
    this.signature.set('');
    this.erreurDeclaration.set(null);
    // Date vide = aujourd'hui dans le fuseau du pays du bien (calculée par l'API)
    this.paiement.reset({ modePaiement: this.modes()[0] ?? null, datePaiement: '', referencePaiement: '' });
    this.feuilleOuverte.set(true);
  }

  validerDeclaration(): void {
    const q = this.aDeclarer();
    if (!q || !this.signature()) return;
    if (this.paiement.invalid) {
      this.paiement.markAllAsTouched();
      return;
    }
    const v = this.paiement.getRawValue();
    this.declarationEnCours.set(true);
    this.erreurDeclaration.set(null);
    this.quittanceService.marquerPayee(q.id, {
      signatureBase64: this.signature(),
      modePaiement: v.modePaiement!,
      datePaiement: v.datePaiement || undefined,
      referencePaiement: v.referencePaiement.trim() || undefined,
    }).subscribe({
      next: () => {
        // 204 sans corps : la liste est relue (statut, mode, PDF signé)
        this.declarationEnCours.set(false);
        this.feuilleOuverte.set(false);
        this.toasts.ok(`Loyer ${de(this.mois(q))} déclaré reçu. La quittance est disponible pour le locataire.`);
        this.recharger();
      },
      error: err => {
        this.declarationEnCours.set(false);
        this.erreurDeclaration.set(messageErreurApi(err, 'La déclaration n’a pas été enregistrée.'));
      },
    });
  }

  /** C8-bis : photo du reçu (HEIC converti en JPEG, 10 Mo au plus), remplaçable. */
  async joindreRecu(q: QuittanceDTO, event: Event): Promise<void> {
    const champ = event.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = '';
    if (!fichier) return;
    let photo: File;
    try {
      photo = await preparerPhoto(fichier);
    } catch (e) {
      this.toasts.erreur((e as Error).message);
      return;
    }
    this.envoiRecuId.set(q.id);
    this.quittanceService.ajouterRecu(q.id, photo).subscribe({
      next: maj => {
        this.quittances.update(liste => liste.map(x => (x.id === q.id ? maj : x)));
        this.envoiRecuId.set(null);
        this.toasts.ok('Reçu enregistré.');
      },
      error: err => {
        this.envoiRecuId.set(null);
        this.toasts.erreur(messageErreurApi(err, 'Le reçu n’a pas pu être enregistré.'));
      },
    });
  }
}
