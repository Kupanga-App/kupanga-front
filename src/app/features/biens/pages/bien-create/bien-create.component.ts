import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BienService } from '../../services/bien.service';
import {
  BienFormDTO,
  BienType,
  ClasseEnergie,
  ClasseGes,
  ModeChauffage,
} from '../../models/bien.model';

@Component({
  selector: 'app-bien-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatStepperModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
  ],
  templateUrl: './bien-create.component.html',
  styleUrls: ['./bien-create.component.scss'],
})
export class BienCreateComponent {
  private fb = inject(FormBuilder);
  private bienService = inject(BienService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  private readonly MAX_FILE_SIZE_MB = 1;
  private readonly MAX_FILE_SIZE_BYTES = this.MAX_FILE_SIZE_MB * 1024 * 1024;
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  currentStep = signal<number>(1);
  selectedFiles = signal<File[]>([]);
  previewUrls = signal<string[]>([]);
  isSubmitting = signal<boolean>(false);

  totalSizeMb = computed(() =>
    (this.selectedFiles().reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)
  );

  readonly today = new Date();

  readonly bienTypes: { value: BienType; label: string; icon: string }[] = [
    { value: 'APPARTEMENT', label: 'Appartement', icon: 'apartment' },
    { value: 'MAISON',      label: 'Maison',      icon: 'house' },
    { value: 'STUDIO',      label: 'Studio',      icon: 'single_bed' },
    { value: 'VILLA',       label: 'Villa',       icon: 'villa' },
    { value: 'BUREAU',      label: 'Bureau',      icon: 'business' },
    { value: 'COMMERCE',    label: 'Commerce',    icon: 'storefront' },
  ];

  readonly modeChauffageOptions: { value: ModeChauffage; label: string }[] = [
    { value: 'ELECTRIQUE',      label: 'Électrique' },
    { value: 'GAZ',             label: 'Gaz' },
    { value: 'FIOUL',           label: 'Fioul' },
    { value: 'BOIS',            label: 'Bois' },
    { value: 'POMPE_A_CHALEUR', label: 'Pompe à chaleur' },
    { value: 'POELE',           label: 'Poêle' },
    { value: 'COLLECTIF',       label: 'Collectif' },
    { value: 'SANS_CHAUFFAGE',  label: 'Sans chauffage' },
  ];

  readonly energieClasses: ClasseEnergie[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  step1Form = this.fb.group({
    titre:             ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    typeBien:          [null as BienType | null, Validators.required],
    description:       ['', Validators.maxLength(1000)],
    loyerMensuel:      [null as number | null, [Validators.required, Validators.min(1)]],
    chargesMensuelles: [null as number | null, [Validators.required, Validators.min(0)]],
    depotGarantie:     [null as number | null, [Validators.required, Validators.min(0)]],
    meuble:            [false],
    colocation:        [false],
    disponibleDe:      [null as Date | null, Validators.required],
  });

  step2Form = this.fb.group({
    surfaceHabitable:  [null as number | null, [Validators.required, Validators.min(9)]],
    nombrePieces:      [null as number | null, [Validators.required, Validators.min(1)]],
    nombreChambres:    [null as number | null, Validators.min(0)],
    etage:             [null as number | null, Validators.min(0)],
    ascenseur:         [false],
    anneeConstruction: [null as number | null, [Validators.min(1800), Validators.max(2100)]],
    modeChauffage:     [null as ModeChauffage | null],
    classeEnergie:     [null as ClasseEnergie | null],
    classeGes:         [null as ClasseGes | null],
  });

  step3Form = this.fb.group({
    adresse:    ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200), Validators.pattern(/\d/)]],
    ville:      ['', [Validators.required, Validators.minLength(2)]],
    codePostal: ['', [Validators.required, Validators.pattern(/^[0-9A-Z\- ]{3,10}$/)]],
    pays:       ['France', [Validators.required, Validators.minLength(2)]],
  });

  nextStep(): void {
    if (this.currentStep() === 1) {
      if (this.step1Form.invalid) {
        this.step1Form.markAllAsTouched();
        return;
      }
    } else if (this.currentStep() === 2) {
      if (this.step2Form.invalid) {
        this.step2Form.markAllAsTouched();
        return;
      }
    } else if (this.currentStep() === 3) {
      if (this.step3Form.invalid) {
        this.step3Form.markAllAsTouched();
        return;
      }
    }
    this.currentStep.update(s => s + 1);
  }

  prevStep(): void {
    this.currentStep.update(s => s - 1);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const rejected: string[] = [];
    const accepted: File[] = [];

    Array.from(input.files).forEach(file => {
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        rejected.push(`${file.name} — format non supporté (JPG, PNG, WEBP uniquement)`);
      } else if (file.size > this.MAX_FILE_SIZE_BYTES) {
        rejected.push(
          `${file.name} — ${(file.size / 1024 / 1024).toFixed(1)} Mo (maximum ${this.MAX_FILE_SIZE_MB} Mo)`
        );
      } else {
        accepted.push(file);
      }
    });

    if (rejected.length > 0) {
      rejected.forEach(msg => {
        this.snackBar.open(`Fichier refusé : ${msg}`, 'Fermer', {
          duration: 6000,
          panelClass: 'kp-snack-error',
        });
      });
    }

    if (accepted.length > 0) {
      this.selectedFiles.update(files => [...files, ...accepted]);
      accepted.forEach(file =>
        this.previewUrls.update(urls => [...urls, URL.createObjectURL(file)])
      );
    }

    input.value = '';
  }

  removeFile(index: number): void {
    URL.revokeObjectURL(this.previewUrls()[index]);
    this.selectedFiles.update(prev => prev.filter((_, i) => i !== index));
    this.previewUrls.update(prev => prev.filter((_, i) => i !== index));
  }

  onSubmit(): void {
    if (this.selectedFiles().length === 0 || this.isSubmitting()) return;

    const oversized = this.selectedFiles().filter(f => f.size > this.MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      this.snackBar.open(
        `${oversized.length} photo(s) dépassent ${this.MAX_FILE_SIZE_MB} Mo — supprimez-les avant de continuer`,
        'Fermer',
        { duration: 6000 }
      );
      return;
    }

    this.isSubmitting.set(true);

    const d = this.step1Form.controls.disponibleDe.value;
    const s2 = this.step2Form.value;

    const bienFormDTO: BienFormDTO = {
      titre:             this.step1Form.value.titre!,
      typeBien:          this.step1Form.value.typeBien as BienType,
      description:       this.step1Form.value.description || undefined,
      loyerMensuel:      Number(this.step1Form.value.loyerMensuel),
      chargesMensuelles: Number(this.step1Form.value.chargesMensuelles),
      depotGarantie:     Number(this.step1Form.value.depotGarantie),
      meuble:            this.step1Form.value.meuble ?? false,
      colocation:        this.step1Form.value.colocation ?? false,
      disponibleDe:      d ? new Date(d).toISOString().split('T')[0] : '',
      surfaceHabitable:  Number(s2.surfaceHabitable),
      nombrePieces:      Number(s2.nombrePieces),
      nombreChambres:    s2.nombreChambres != null ? Number(s2.nombreChambres) : undefined,
      etage:             s2.etage != null ? Number(s2.etage) : undefined,
      ascenseur:         s2.ascenseur ?? undefined,
      anneeConstruction: s2.anneeConstruction != null ? Number(s2.anneeConstruction) : undefined,
      modeChauffage:     (s2.modeChauffage as ModeChauffage) || undefined,
      classeEnergie:     (s2.classeEnergie as ClasseEnergie) || undefined,
      classeGes:         (s2.classeGes as ClasseGes) || undefined,
      adresse:           this.step3Form.value.adresse!,
      ville:             this.step3Form.value.ville!,
      codePostal:        this.step3Form.value.codePostal!,
      pays:              this.step3Form.value.pays!,
    };

    this.bienService.create({ bienFormDTO, files: this.selectedFiles() }).subscribe({
      next: () => {
        this.previewUrls().forEach(url => URL.revokeObjectURL(url));
        this.isSubmitting.set(false);
        this.snackBar.open('Bien créé avec succès', 'Fermer', { duration: 4000 });
        this.router.navigate(['/pro/biens']);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        if (err.status === 403) {
          this.snackBar.open('Accès refusé', 'Fermer', { duration: 4000, panelClass: ['snack-error'] });
        } else if (err.status === 422) {
          this.snackBar.open('Adresse introuvable sur la carte', 'Fermer', { duration: 4000, panelClass: ['snack-error'] });
        } else if (err.status === 500) {
          this.snackBar.open('Erreur serveur. Vérifiez que l\'adresse est complète et correcte.', 'Fermer', { duration: 6000, panelClass: ['snack-error'] });
        } else if (err.status === 400) {
          const message = err.error?.message ?? 'Veuillez corriger les erreurs du formulaire';
          this.snackBar.open(message, 'Fermer', { duration: 5000, panelClass: ['snack-error'] });
        } else {
          this.snackBar.open('Une erreur inattendue est survenue.', 'Fermer', { duration: 5000, panelClass: ['snack-error'] });
        }
      },
    });
  }
}
