import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BienService } from '../../services/bien.service';
import {
  BienDTO,
  BienFormDTO,
  BienType,
  ClasseEnergie,
  ClasseGes,
  ModeChauffage,
} from '../../models/bien.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'kp-bien-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    IconComponent,
  ],
  templateUrl: './bien-edit.component.html',
  styleUrls: ['./bien-edit.component.scss'],
})
export class BienEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bienService = inject(BienService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private snackBar = inject(MatSnackBar);

  bien = signal<BienDTO | null>(null);
  loading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  activeSection = signal<number>(0);

  bienId = signal<number>(0);

  refTag = computed(() => {
    const id = this.bienId();
    return id ? `KPG-${String(id).padStart(4, '0')}` : '';
  });

  readonly navSections = [
    { label: 'Général', icon: 'info' },
    { label: 'Caractéristiques', icon: 'layers' },
    { label: 'Loyer', icon: 'dollar-sign' },
    { label: 'Localisation', icon: 'map-pin' },
  ];

  goBack(): void { this.location.back(); }

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

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bienId.set(id);

    this.bienService.getById(id).subscribe({
      next: (data) => {
        this.bien.set(data);
        this.prefillForms(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Impossible de charger le bien.', 'Fermer', { duration: 4000 });
        this.router.navigate(['/pro/biens']);
      },
    });
  }

  private prefillForms(b: BienDTO): void {
    this.step1Form.patchValue({
      titre:             b.titre,
      typeBien:          b.typeBien,
      description:       b.description ?? '',
      loyerMensuel:      b.loyerMensuel ?? null,
      chargesMensuelles: b.chargesMensuelles ?? null,
      depotGarantie:     b.depotGarantie ?? null,
      meuble:            b.meuble ?? false,
      colocation:        b.colocation ?? false,
      disponibleDe:      b.disponibleDe ? new Date(b.disponibleDe) : null,
    });

    this.step2Form.patchValue({
      surfaceHabitable:  b.surfaceHabitable ?? null,
      nombrePieces:      b.nombrePieces ?? null,
      nombreChambres:    b.nombreChambres ?? null,
      etage:             b.etage ?? null,
      ascenseur:         b.ascenseur ?? false,
      anneeConstruction: b.anneeConstruction ?? null,
      modeChauffage:     b.modeChauffage ?? null,
      classeEnergie:     b.classeEnergie ?? null,
      classeGes:         b.classeGes ?? null,
    });

    this.step3Form.patchValue({
      adresse:    b.adresse,
      ville:      b.ville,
      codePostal: b.codePostal,
      pays:       b.pays,
    });
  }

  scrollToSection(index: number): void {
    this.activeSection.set(index);
    const id = ['section-general', 'section-caracteristiques', 'section-loyer', 'section-localisation'][index];
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onSubmit(): void {
    if (this.step1Form.invalid) { this.step1Form.markAllAsTouched(); return; }
    if (this.step2Form.invalid) { this.step2Form.markAllAsTouched(); return; }
    if (this.step3Form.invalid || this.isSubmitting()) { this.step3Form.markAllAsTouched(); return; }

    this.isSubmitting.set(true);

    const d = this.step1Form.controls.disponibleDe.value;
    const s2 = this.step2Form.value;

    const dto: BienFormDTO = {
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

    this.bienService.update(this.bienId(), dto).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.snackBar.open('Bien mis à jour avec succès', 'Fermer', { duration: 4000 });
        this.router.navigate(['/pro/biens', this.bienId()]);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        if (err.status === 403) {
          this.snackBar.open('Accès refusé', 'Fermer', { duration: 4000 });
        } else if (err.status === 422) {
          this.snackBar.open('Adresse introuvable sur la carte', 'Fermer', { duration: 4000 });
        } else if (err.status === 400) {
          const message = err.error?.message ?? 'Veuillez corriger les erreurs du formulaire';
          this.snackBar.open(message, 'Fermer', { duration: 5000 });
        } else {
          this.snackBar.open('Une erreur inattendue est survenue.', 'Fermer', { duration: 5000 });
        }
      },
    });
  }
}
