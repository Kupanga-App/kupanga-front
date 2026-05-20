import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { ChipsGroupComponent, ChipOption } from '../../../../../shared/components/chips-group/chips-group.component';
import { OptCardComponent } from '../../../../../shared/components/opt-card/opt-card.component';
import { PaperPreviewComponent } from '../../../../../shared/components/paper-preview/paper-preview.component';

import { GestionLogementService } from '../../../services/gestion-logement.service';
import { QuittanceService } from '../../../services/quittance.service';
import { ContratService } from '../../../services/contrat.service';
import { BienDTO } from '../../../../biens/models/bien.model';
import { ContratDTO } from '../../../models/contrat.model';

type PaymentStatus = 'ENCAISSE' | 'PARTIEL' | 'IMPAYE';

@Component({
  selector: 'kp-quittance-new',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    IconComponent,
    ChipsGroupComponent,
    OptCardComponent,
    PaperPreviewComponent,
  ],
  templateUrl: './quittance-new.component.html',
  styleUrls: ['./quittance-new.component.scss'],
})
export class QuittanceNewComponent implements OnInit {
  private gestion = inject(GestionLogementService);
  private quittanceService = inject(QuittanceService);
  private contratService = inject(ContratService);
  private snackBar = inject(MatSnackBar);

  readonly bien = signal<BienDTO | null>(null);
  readonly contrat = signal<ContratDTO | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);

  readonly paymentStatus = signal<PaymentStatus>('ENCAISSE');

  readonly sendOptions = signal({ email: true, archive: true, copy: false });

  readonly currentYear = new Date().getFullYear();
  readonly years = [this.currentYear, this.currentYear - 1, this.currentYear - 2];

  readonly monthChips: ChipOption[] = [
    { value: '1', label: 'Janv.' }, { value: '2', label: 'Févr.' },
    { value: '3', label: 'Mars' },  { value: '4', label: 'Avr.' },
    { value: '5', label: 'Mai' },   { value: '6', label: 'Juin' },
    { value: '7', label: 'Juil.' }, { value: '8', label: 'Août' },
    { value: '9', label: 'Sept.' }, { value: '10', label: 'Oct.' },
    { value: '11', label: 'Nov.' }, { value: '12', label: 'Déc.' },
  ];

  readonly selectedMonth = signal<string>(String(new Date().getMonth() + 1));

  form = new FormGroup({
    annee: new FormControl<number>(this.currentYear, { nonNullable: true }),
    dateEcheance: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    loyerMensuel: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    chargesMensuelles: new FormControl<number | null>(null, [Validators.min(0)]),
  });

  readonly total = computed(() => {
    const loyer = this.form.get('loyerMensuel')?.value ?? 0;
    const charges = this.form.get('chargesMensuelles')?.value ?? 0;
    return (loyer || 0) + (charges || 0);
  });

  readonly refTag = computed(() => {
    const id = this.bien()?.id;
    return id ? `KPG-${String(id).padStart(4, '0')}` : '';
  });

  readonly monthLabel = computed(() => {
    const m = Number(this.selectedMonth());
    return new Date(2000, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  ngOnInit(): void {
    const b = this.gestion.bien();
    if (!b) return;
    this.bien.set(b);
    this.form.patchValue({
      loyerMensuel: b.loyerMensuel ?? null,
      chargesMensuelles: b.chargesMensuelles ?? null,
    });

    this.contratService.getByBien(b.id).subscribe({
      next: (list) => this.contrat.set(list.find(c => c.statut === 'SIGNE') ?? null),
    });
  }

  onMonthChange(val: string): void {
    this.selectedMonth.set(val);
  }

  setPaymentStatus(s: PaymentStatus): void {
    this.paymentStatus.set(s);
  }

  toggleSend(key: keyof ReturnType<typeof this.sendOptions>): void {
    this.sendOptions.update(o => ({ ...o, [key]: !o[key] }));
  }

  cancel(): void {
    this.gestion.activeView.set(null);
  }

  submit(): void {
    if (this.form.invalid || !this.bien()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const b = this.bien()!;
    const c = this.contrat();

    this.submitting.set(true);
    this.quittanceService.create({
      bienId: b.id,
      emailLocataire: b.locataire?.mail ?? '',
      contratId: c?.id,
      mois: Number(this.selectedMonth()),
      annee: v.annee,
      dateEcheance: v.dateEcheance,
      loyerMensuel: c ? undefined : (v.loyerMensuel ?? undefined),
      chargesMensuelles: c ? undefined : (v.chargesMensuelles ?? undefined),
    }).subscribe({
      next: () => {
        this.snackBar.open('Quittance générée avec succès !', 'OK', { duration: 4000 });
        this.gestion.activeView.set(null);
      },
      error: () => {
        this.snackBar.open('Erreur lors de la génération', 'Fermer', { duration: 4000 });
        this.submitting.set(false);
      },
    });
  }
}
