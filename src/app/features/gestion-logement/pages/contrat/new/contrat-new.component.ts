import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { WizardStepperComponent, WizardStep } from '../../../../../shared/components/wizard-stepper/wizard-stepper.component';
import { OptCardComponent } from '../../../../../shared/components/opt-card/opt-card.component';
import { ChipsGroupComponent, ChipOption } from '../../../../../shared/components/chips-group/chips-group.component';
import { PaperPreviewComponent } from '../../../../../shared/components/paper-preview/paper-preview.component';

import { GestionLogementService } from '../../../services/gestion-logement.service';
import { ContratService } from '../../../services/contrat.service';
import { BienDTO } from '../../../../biens/models/bien.model';

type TypeBail = 'NUE' | 'MEUBLEE' | 'COLOC';

@Component({
  selector: 'kp-contrat-new',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    IconComponent,
    WizardStepperComponent,
    OptCardComponent,
    ChipsGroupComponent,
    PaperPreviewComponent,
  ],
  templateUrl: './contrat-new.component.html',
  styleUrls: ['./contrat-new.component.scss'],
})
export class ContratNewComponent implements OnInit {
  private gestion = inject(GestionLogementService);
  private contratService = inject(ContratService);
  private snackBar = inject(MatSnackBar);

  readonly bien = signal<BienDTO | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly currentStep = signal(0);
  readonly sansBail = signal(false);
  readonly typeBail = signal<TypeBail>('NUE');

  readonly steps: WizardStep[] = [
    { label: 'Locataire', sublabel: 'Locataire' },
    { label: 'Bail', sublabel: 'Bail' },
    { label: 'Loyer', sublabel: 'Loyer' },
    { label: 'Récap', sublabel: 'Récap' },
  ];

  readonly dureChips: ChipOption[] = [
    { value: '1', label: '1 mois' }, { value: '3', label: '3 mois' },
    { value: '6', label: '6 mois' }, { value: '9', label: '9 mois' },
    { value: '12', label: '12 mois' }, { value: '24', label: '24 mois' },
    { value: '36', label: '36 mois' },
  ];

  readonly selectedDuree = signal<string>('12');

  step1 = new FormGroup({
    emailLocataire: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  step2 = new FormGroup({
    dateDebut: new FormControl<Date | null>(null, Validators.required),
    dateFin: new FormControl<Date | null>(null),
    dureeBailMois: new FormControl<number>(12, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    preavisMois: new FormControl<number>(3, { nonNullable: true }),
  });

  step3 = new FormGroup({
    loyerMensuel: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    chargesMensuelles: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    depotGarantie: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
  });

  readonly totalMensuel = computed(() => {
    const l = this.step3.get('loyerMensuel')?.value ?? 0;
    const c = this.step3.get('chargesMensuelles')?.value ?? 0;
    return (l || 0) + (c || 0);
  });

  readonly today = new Date();

  readonly refTag = computed(() => {
    const id = this.bien()?.id;
    return id ? `KPG-${String(id).padStart(4, '0')}` : '';
  });

  readonly typeBailLabel = computed(() => {
    const map: Record<TypeBail, string> = {
      NUE: 'Bail nue propriété',
      MEUBLEE: 'Bail meublé',
      COLOC: 'Cohabitation / Colocation',
    };
    return map[this.typeBail()];
  });

  ngOnInit(): void {
    const b = this.gestion.bien();
    if (!b) return;
    this.bien.set(b);
    this.step1.patchValue({ emailLocataire: b.locataire?.mail ?? '' });
    this.step3.patchValue({
      loyerMensuel: b.loyerMensuel ?? null,
      chargesMensuelles: b.chargesMensuelles ?? null,
      depotGarantie: b.depotGarantie ?? null,
    });
  }

  setTypeBail(type: TypeBail): void {
    this.typeBail.set(type);
  }

  onDureeChange(val: string): void {
    this.selectedDuree.set(val);
    this.step2.patchValue({ dureeBailMois: Number(val) });
  }

  toggleSansBail(): void {
    this.sansBail.update(v => !v);
    if (this.sansBail()) {
      this.step1.get('emailLocataire')?.clearValidators();
      this.step1.get('emailLocataire')?.updateValueAndValidity();
    } else {
      this.step1.get('emailLocataire')?.setValidators([Validators.required, Validators.email]);
      this.step1.get('emailLocataire')?.updateValueAndValidity();
    }
  }

  next(): void {
    const step = this.currentStep();
    if (step === 0 && !this.sansBail()) {
      if (this.step1.invalid) { this.step1.markAllAsTouched(); return; }
    }
    if (step === 1) {
      if (this.step2.invalid) { this.step2.markAllAsTouched(); return; }
    }
    if (step === 2) {
      if (this.step3.invalid) { this.step3.markAllAsTouched(); return; }
    }
    if (step < 3) this.currentStep.set(step + 1);
  }

  prev(): void {
    const step = this.currentStep();
    if (step > 0) this.currentStep.set(step - 1);
  }

  goToStep(i: number): void {
    if (i < this.currentStep()) this.currentStep.set(i);
  }

  submit(): void {
    const bienId = this.bien()!.id;
    const v1 = this.step1.getRawValue();
    const v2 = this.step2.getRawValue();
    const v3 = this.step3.getRawValue();

    this.submitting.set(true);
    this.contratService.create({
      bienId,
      emailLocataire: this.sansBail() ? '' : v1.emailLocataire,
      dateDebut: this.toIso(v2.dateDebut!),
      dateFin: v2.dateFin ? this.toIso(v2.dateFin) : undefined,
      dureeBailMois: v2.dureeBailMois,
      loyerMensuel: v3.loyerMensuel!,
      chargesMensuelles: v3.chargesMensuelles!,
      depotGarantie: v3.depotGarantie!,
    }).subscribe({
      next: () => {
        this.snackBar.open('Contrat créé — signez pour le valider.', 'OK', { duration: 5000 });
        this.gestion.activeView.set(null);
      },
      error: () => {
        this.snackBar.open('Erreur lors de la création du contrat', 'Fermer', { duration: 4000 });
        this.submitting.set(false);
      },
    });
  }

  cancel(): void {
    this.gestion.activeView.set(null);
  }

  private toIso(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatDate(date: Date | null | undefined): string {
    if (!date) return '—';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
