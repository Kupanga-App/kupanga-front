import { Component, inject, signal } from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { BienService } from '../../services/bien.service';
import { BienFormDTO, BienType } from '../../models/bien.model';

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
  ],
  templateUrl: './bien-create.component.html',
  styleUrls: ['./bien-create.component.scss'],
})
export class BienCreateComponent {
  private fb = inject(FormBuilder);
  private bienService = inject(BienService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  currentStep = signal<number>(1);
  selectedFiles = signal<File[]>([]);
  previewUrls = signal<string[]>([]);
  isSubmitting = signal<boolean>(false);

  readonly bienTypes: { value: BienType; label: string; icon: string }[] = [
    { value: 'APPARTEMENT', label: 'Appartement', icon: 'apartment' },
    { value: 'MAISON',      label: 'Maison',      icon: 'house' },
    { value: 'STUDIO',      label: 'Studio',      icon: 'single_bed' },
  ];

  step1Form = this.fb.group({
    titre:       ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    typeBien:    [null as BienType | null, Validators.required],
    description: ['', Validators.maxLength(1000)],
  });

  step2Form = this.fb.group({
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
    }
    this.currentStep.update(s => s + 1);
  }

  prevStep(): void {
    this.currentStep.update(s => s - 1);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
    const newUrls = validFiles.map(f => URL.createObjectURL(f));
    this.selectedFiles.update(prev => [...prev, ...validFiles]);
    this.previewUrls.update(prev => [...prev, ...newUrls]);
    input.value = '';
  }

  removeFile(index: number): void {
    URL.revokeObjectURL(this.previewUrls()[index]);
    this.selectedFiles.update(prev => prev.filter((_, i) => i !== index));
    this.previewUrls.update(prev => prev.filter((_, i) => i !== index));
  }

  onSubmit(): void {
    if (this.selectedFiles().length === 0 || this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const bienFormDTO: BienFormDTO = {
      titre:       this.step1Form.value.titre!,
      typeBien:    this.step1Form.value.typeBien as BienType,
      description: this.step1Form.value.description || undefined,
      adresse:     this.step2Form.value.adresse!,
      ville:       this.step2Form.value.ville!,
      codePostal:  this.step2Form.value.codePostal!,
      pays:        this.step2Form.value.pays!,
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
