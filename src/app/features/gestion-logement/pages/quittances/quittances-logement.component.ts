import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { QuittanceDTO, QuittanceStatut } from '../../models/quittance.model';
import { SignaturePadComponent } from '../../../../shared/components/signature-pad/signature-pad.component';

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
    SignaturePadComponent,
  ],
  templateUrl: './quittances-logement.component.html',
  styleUrls: ['./quittances-logement.component.scss'],
})
export class QuittancesLogementComponent implements OnInit {
  private gestion = inject(GestionLogementService);
  private quittanceService = inject(QuittanceService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

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
      error: () => {
        this.snackBar.open('Erreur lors de la génération', 'Fermer', { duration: 4000 });
        this.creating.set(false);
      },
    });
  }

  startMarkerPayee(id: number): void {
    this.signingId.set(id);
    this.signatureBase64.set('');
  }

  cancelMarquer(): void {
    this.signingId.set(null);
    this.signatureBase64.set('');
  }

  marquerPayee(id: number): void {
    const sig = this.signatureBase64();
    if (!sig) return;
    this.marking.set(true);
    this.quittanceService.marquerPayee(id, sig).subscribe({
      next: (updated) => {
        this.quittances.update(list => list.map(q => q.id === id ? updated : q));
        this.marking.set(false);
        this.signingId.set(null);
        this.signatureBase64.set('');
        this.snackBar.open('Quittance marquée comme payée !', 'OK', { duration: 4000 });
      },
      error: () => {
        this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 4000 });
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
}
