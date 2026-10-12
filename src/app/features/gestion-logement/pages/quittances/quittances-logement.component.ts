import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MontantPipe, SymboleDevisePipe } from '../../../../core/money/montant';
import { CommonModule, DatePipe } from '@angular/common';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { GestionLogementService } from '../../services/gestion-logement.service';
import { QuittanceService } from '../../services/quittance.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { LIBELLES_MODE_PAIEMENT, ModePaiement, QuittanceDTO, QuittanceStatut } from '../../models/quittance.model';
import { JuridictionService } from '../../../biens/services/juridiction.service';
import { ACCEPT_PHOTOS, preparerPhoto } from '../../../../core/media/photos';
import { BoutonWhatsappComponent } from '../../components/bouton-whatsapp/bouton-whatsapp.component';
import { SignaturePadComponent } from '../../../../shared/components/signature-pad/signature-pad.component';
import { messageErreurApi } from '../../../../core/http/api-error';

@Component({
  selector: 'kp-quittances-logement',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SignaturePadComponent, MontantPipe, SymboleDevisePipe, BoutonWhatsappComponent
  ],
  templateUrl: './quittances-logement.component.html',
  styleUrls: ['./quittances-logement.component.scss'],
})
export class QuittancesLogementComponent implements OnInit {
  private gestion = inject(GestionLogementService);
  private quittanceService = inject(QuittanceService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private juridictions = inject(JuridictionService);

  readonly bien = this.gestion.bien;
  readonly contrat = this.gestion.contrat;

  readonly isProprietaire = computed(
    () => this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE'
  );
  readonly contratSigne = computed(
    () => this.gestion.contratStatut() === 'SIGNE'
  );

  readonly quittances = signal<QuittanceDTO[]>([]);
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly marking = signal(false);
  readonly showForm = signal(false);
  readonly signingId = signal<number | null>(null);
  readonly signatureBase64 = signal('');

  // ─── C8-bis : loyer reçu hors application ───
  readonly libellesMode = LIBELLES_MODE_PAIEMENT;
  readonly acceptPhotos = ACCEPT_PHOTOS;
  /** Modes proposés dans le pays du bien (profil de juridiction). */
  readonly modesPaiement = signal<ModePaiement[]>([]);
  readonly envoiRecuId = signal<number | null>(null);
  readonly aujourdhui = new Date().toISOString().split('T')[0];
  paiementForm = new FormGroup({
    modePaiement: new FormControl<ModePaiement | null>(null, Validators.required),
    datePaiement: new FormControl('', { nonNullable: true }),
    referencePaiement: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100), Validators.pattern(/^[\p{L}0-9 .,/#_-]*$/u)],
    }),
  });

  readonly months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleDateString('fr-FR', { month: 'long' }),
  }));

  createForm = new FormGroup({
    mois: new FormControl<number | null>(null, Validators.required),
    annee: new FormControl<number>(new Date().getFullYear(), {
      nonNullable: true,
      validators: [Validators.required, Validators.min(2000)],
    }),
    dateEcheance: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    loyerMensuel: new FormControl<number | null>(null),
    chargesMensuelles: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    this.loadQuittances();
    const pays = this.bien()?.pays;
    if (pays && this.isProprietaire()) {
      this.juridictions.configuration(pays).subscribe({
        next: (config) => this.modesPaiement.set(config.modesPaiement ?? []),
        error: () => this.modesPaiement.set([]),
      });
    }
  }

  private loadQuittances(): void {
    this.loading.set(true);
    if (this.isProprietaire()) {
      const bienId = this.bien()?.id;
      if (!bienId) { this.loading.set(false); return; }
      this.quittanceService.getByBien(bienId).subscribe({
        next: (list) => { this.quittances.set(list); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else {
      this.quittanceService.getMesQuittances().subscribe({
        next: (list) => { this.quittances.set(list); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    }
  }

  navigateToNew(): void {
    this.gestion.activeView.set('quittance-new');
  }

  openForm(): void {
    const b = this.bien();
    this.createForm.patchValue({
      loyerMensuel: b?.loyerMensuel ?? null,
      chargesMensuelles: b?.chargesMensuelles ?? null,
    });
    this.showForm.set(true);
  }

  submitCreate(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    const v = this.createForm.getRawValue();
    const b = this.bien()!;
    const c = this.contrat();

    this.creating.set(true);
    this.quittanceService.create({
      bienId: b.id,
      emailLocataire: b.locataire?.mail ?? '',
      contratId: c?.statut === 'SIGNE' ? c.id : undefined,
      mois: v.mois!,
      annee: v.annee,
      dateEcheance: v.dateEcheance,
      loyerMensuel: c?.statut === 'SIGNE' ? undefined : (v.loyerMensuel ?? undefined),
      chargesMensuelles: c?.statut === 'SIGNE' ? undefined : (v.chargesMensuelles ?? undefined),
    }).subscribe({
      next: (q) => {
        this.quittances.update(list => [q, ...list]);
        this.creating.set(false);
        this.showForm.set(false);
        this.createForm.reset({ annee: new Date().getFullYear() });
      },
      error: (err) => {
        this.snackBar.open(messageErreurApi(err, 'Erreur lors de la génération'), 'Fermer', { duration: 4000 });
        this.creating.set(false);
      },
    });
  }

  startMarkerPayee(id: number): void {
    this.signingId.set(id);
    this.signatureBase64.set('');
    // Date vide = aujourd'hui dans le fuseau du pays du bien (calculée par l'API, pas par le navigateur)
    this.paiementForm.reset({ modePaiement: this.modesPaiement()[0] ?? null, datePaiement: '', referencePaiement: '' });
  }

  cancelMarquer(): void {
    this.signingId.set(null);
    this.signatureBase64.set('');
  }

  marquerPayee(id: number): void {
    const sig = this.signatureBase64();
    if (!sig) return;
    if (this.paiementForm.invalid) { this.paiementForm.markAllAsTouched(); return; }
    const v = this.paiementForm.getRawValue();
    this.marking.set(true);
    this.quittanceService.marquerPayee(id, {
      signatureBase64: sig,
      modePaiement: v.modePaiement!,
      datePaiement: v.datePaiement || undefined,
      referencePaiement: v.referencePaiement.trim() || undefined,
    }).subscribe({
      next: () => {
        // 204 sans corps : la liste est relue (statut, mode, PDF signé)
        this.loadQuittances();
        this.marking.set(false);
        this.signingId.set(null);
        this.signatureBase64.set('');
        this.snackBar.open('Quittance marquée comme payée !', 'OK', { duration: 4000 });
      },
      error: (err) => {
        this.snackBar.open(messageErreurApi(err, 'Erreur lors de la mise à jour'), 'Fermer', { duration: 4000 });
        this.marking.set(false);
      },
    });
  }

  onSignatureChange(val: string): void {
    this.signatureBase64.set(val);
  }

  statutLabel(s: QuittanceStatut): string {
    const map: Record<QuittanceStatut, string> = {
      EN_ATTENTE: 'En attente',
      PAYEE: 'Payée',
      EN_RETARD: 'En retard',
      IMPAYEE: 'Impayée',
    };
    return map[s] ?? s;
  }

  statutClass(s: QuittanceStatut): string {
    switch (s) {
      case 'PAYEE': return 'kp-badge-success';
      case 'EN_ATTENTE': return 'kp-badge-pending';
      case 'EN_RETARD':
      case 'IMPAYEE': return 'kp-badge-danger';
      default: return 'kp-badge-inactive';
    }
  }

  /** C8-bis : photo du reçu (HEIC converti en JPEG, 10 Mo au plus). */
  async onRecuChoisi(id: number, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    if (!fichier) return;
    let photo: File;
    try {
      photo = await preparerPhoto(fichier);
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Fermer', { duration: 5000 });
      return;
    }
    this.envoiRecuId.set(id);
    this.quittanceService.ajouterRecu(id, photo).subscribe({
      next: (q) => {
        this.quittances.update(list => list.map(x => x.id === id ? q : x));
        this.envoiRecuId.set(null);
        this.snackBar.open('Reçu enregistré', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.envoiRecuId.set(null);
        this.snackBar.open(messageErreurApi(err, 'Le reçu n\'a pas pu être enregistré'), 'Fermer', { duration: 5000 });
      },
    });
  }
}
