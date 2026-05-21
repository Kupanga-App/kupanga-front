import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormArray,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { WizardStepperComponent, WizardStep } from '../../../../../shared/components/wizard-stepper/wizard-stepper.component';
import { OptCardComponent } from '../../../../../shared/components/opt-card/opt-card.component';
import { ChipsGroupComponent, ChipOption } from '../../../../../shared/components/chips-group/chips-group.component';
import { AddCardComponent } from '../../../../../shared/components/add-card/add-card.component';

import { GestionLogementService } from '../../../services/gestion-logement.service';
import { EdlService } from '../../../services/edl.service';
import { BienDTO } from '../../../../biens/models/bien.model';
import { EdlType, EtatElement, TypeElement, TypeCompteur } from '../../../models/edl.model';

interface CompteurForm {
  typeCompteur: FormControl<TypeCompteur>;
  numeroCompteur: FormControl<string>;
  index: FormControl<number>;
  unite: FormControl<string>;
}

interface CleForm {
  typeCle: FormControl<string>;
  quantite: FormControl<number>;
}

interface ElementForm {
  typeElement: FormControl<TypeElement>;
  etatElement: FormControl<EtatElement>;
  description: FormControl<string>;
  observation: FormControl<string>;
}

interface PieceForm {
  nomPiece: FormControl<string>;
  ordre: FormControl<number>;
  observations: FormControl<string>;
  elements: FormArray<FormGroup<ElementForm>>;
}

@Component({
  selector: 'kp-edl-new',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    IconComponent,
    WizardStepperComponent,
    OptCardComponent,
    ChipsGroupComponent,
    AddCardComponent,
  ],
  templateUrl: './edl-new.component.html',
  styleUrls: ['./edl-new.component.scss'],
})
export class EdlNewComponent implements OnInit {
  private gestion = inject(GestionLogementService);
  private edlService = inject(EdlService);
  private snackBar = inject(MatSnackBar);

  readonly bien = signal<BienDTO | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly currentStep = signal(0);

  readonly locataireEmail = computed(() => this.bien()?.locataire?.mail ?? null);

  readonly steps: WizardStep[] = [
    { label: 'Informations', sublabel: 'Infos' },
    { label: 'Compteurs', sublabel: 'Compteurs' },
    { label: 'Clés', sublabel: 'Clés' },
    { label: 'Pièces', sublabel: 'Pièces' },
  ];

  readonly edlTypes: ChipOption[] = [
    { value: 'ENTREE', label: 'Entrée' },
    { value: 'SORTIE', label: 'Sortie' },
  ];

  readonly meteoChips: ChipOption[] = [
    { value: 'ENSOLEILLE', label: 'Ensoleillé' },
    { value: 'NUAGEUX', label: 'Nuageux' },
    { value: 'PLUVIEUX', label: 'Pluvieux' },
    { value: 'NEIGE', label: 'Neige' },
  ];

  readonly presentsChips: ChipOption[] = [
    { value: 'BAILLEUR', label: 'Bailleur' },
    { value: 'LOCATAIRE', label: 'Locataire' },
    { value: 'AGENT', label: 'Agent' },
    { value: 'TEMOIN', label: 'Témoin' },
  ];

  readonly selectedType = signal<string>('ENTREE');
  readonly selectedMeteo = signal<string | null>(null);
  readonly selectedPresents = signal<string[]>([]);

  readonly etatOptions: { value: EtatElement; label: string; icon: string }[] = [
    { value: 'BON', label: 'Bon état', icon: 'circle-check' },
    { value: 'USAGE_NORMAL', label: 'Usage normal', icon: 'clock' },
    { value: 'MAUVAIS', label: 'Mauvais état', icon: 'alert-triangle' },
    { value: 'HORS_SERVICE', label: 'Hors service', icon: 'x' },
  ];

  readonly typeElementOptions: { value: TypeElement; label: string }[] = [
    { value: 'MUR', label: 'Mur' },
    { value: 'PLAFOND', label: 'Plafond' },
    { value: 'SOL', label: 'Sol' },
    { value: 'FENETRE', label: 'Fenêtre' },
    { value: 'PORTE', label: 'Porte' },
    { value: 'VOLET', label: 'Volet' },
    { value: 'PRISE', label: 'Prise électrique' },
    { value: 'LUMINAIRE', label: 'Luminaire' },
    { value: 'RADIATEUR', label: 'Radiateur' },
    { value: 'EQUIPEMENT', label: 'Équipement' },
    { value: 'AUTRE', label: 'Autre' },
  ];

  readonly typeCompteurOptions: { value: TypeCompteur; label: string; icon: string; unite: string }[] = [
    { value: 'ELECTRICITE_HP', label: 'Électricité (HP)', icon: 'zap', unite: 'kWh' },
    { value: 'ELECTRICITE_HC', label: 'Électricité (HC)', icon: 'zap', unite: 'kWh' },
    { value: 'EAU_FROIDE', label: 'Eau froide', icon: 'droplets', unite: 'm³' },
    { value: 'EAU_CHAUDE', label: 'Eau chaude', icon: 'droplets', unite: 'm³' },
    { value: 'GAZ', label: 'Gaz', icon: 'flame', unite: 'm³' },
  ];

  readonly metersDefault: TypeCompteur[] = ['ELECTRICITE_HP', 'EAU_FROIDE', 'GAZ'];

  readonly keysDefault = [
    { type: 'Porte d\'entrée', icon: 'key' },
    { type: 'Garage', icon: 'key' },
    { type: 'Boîte aux lettres', icon: 'key' },
  ];

  readonly roomPresets: { type: string; icon: string }[] = [
    { type: 'Salon', icon: 'home' },
    { type: 'Chambre', icon: 'bed' },
    { type: 'Cuisine', icon: 'utensils' },
    { type: 'Salle de bain', icon: 'droplets' },
    { type: 'WC', icon: 'home' },
    { type: 'Entrée', icon: 'home' },
    { type: 'Bureau', icon: 'briefcase' },
    { type: 'Cave', icon: 'layers' },
  ];

  step1 = new FormGroup({
    date: new FormControl<Date | null>(null, [Validators.required]),
    heure: new FormControl('', { nonNullable: true }),
    observationsGenerales: new FormControl(''),
  });

  step2 = new FormGroup({
    compteurs: new FormArray<FormGroup<CompteurForm>>([]),
  });

  step3 = new FormGroup({
    cles: new FormArray<FormGroup<CleForm>>([]),
  });

  step4 = new FormGroup({
    pieces: new FormArray<FormGroup<PieceForm>>([]),
  });

  get compteurs(): FormArray<FormGroup<CompteurForm>> {
    return this.step2.get('compteurs') as FormArray<FormGroup<CompteurForm>>;
  }

  get cles(): FormArray<FormGroup<CleForm>> {
    return this.step3.get('cles') as FormArray<FormGroup<CleForm>>;
  }

  get pieces(): FormArray<FormGroup<PieceForm>> {
    return this.step4.get('pieces') as FormArray<FormGroup<PieceForm>>;
  }

  getElements(i: number): FormArray<FormGroup<ElementForm>> {
    return this.pieces.at(i).get('elements') as FormArray<FormGroup<ElementForm>>;
  }

  ngOnInit(): void {
    const b = this.gestion.bien();
    if (!b) return;
    this.bien.set(b);
    this.initDefaultMeters();
    this.initDefaultKeys();
  }

  private initDefaultMeters(): void {
    this.metersDefault.forEach(type => {
      const opt = this.typeCompteurOptions.find(o => o.value === type)!;
      this.addCompteur(type, opt.unite);
    });
  }

  private initDefaultKeys(): void {
    this.keysDefault.forEach(k => this.addCle(k.type));
  }

  addCompteur(type: TypeCompteur = 'EAU_FROIDE', unite = ''): void {
    this.compteurs.push(new FormGroup<CompteurForm>({
      typeCompteur: new FormControl<TypeCompteur>(type, { nonNullable: true, validators: [Validators.required] }),
      numeroCompteur: new FormControl('', { nonNullable: true }),
      index: new FormControl(0, { nonNullable: true }),
      unite: new FormControl(unite, { nonNullable: true }),
    }));
  }

  onTypeCompteurChange(i: number, value: TypeCompteur): void {
    const opt = this.typeCompteurOptions.find(o => o.value === value);
    if (opt) {
      this.compteurs.at(i).get('unite')?.setValue(opt.unite);
    }
  }

  removeCompteur(i: number): void { this.compteurs.removeAt(i); }

  addCle(type = ''): void {
    this.cles.push(new FormGroup<CleForm>({
      typeCle: new FormControl(type, { nonNullable: true, validators: [Validators.required] }),
      quantite: new FormControl(1, { nonNullable: true, validators: [Validators.min(1)] }),
    }));
  }

  removeCle(i: number): void { this.cles.removeAt(i); }

  incrementCle(i: number): void {
    const ctrl = this.cles.at(i).get('quantite')!;
    ctrl.setValue(ctrl.value + 1);
  }

  decrementCle(i: number): void {
    const ctrl = this.cles.at(i).get('quantite')!;
    if (ctrl.value > 1) ctrl.setValue(ctrl.value - 1);
  }

  addPiece(type = 'Pièce'): void {
    this.pieces.push(new FormGroup<PieceForm>({
      nomPiece: new FormControl(type, { nonNullable: true, validators: [Validators.required] }),
      ordre: new FormControl(this.pieces.length + 1, { nonNullable: true }),
      observations: new FormControl('', { nonNullable: true }),
      elements: new FormArray<FormGroup<ElementForm>>([]),
    }));
    this.addElement(this.pieces.length - 1);
  }

  removePiece(i: number): void { this.pieces.removeAt(i); }

  addElement(pieceIdx: number): void {
    this.getElements(pieceIdx).push(new FormGroup<ElementForm>({
      typeElement: new FormControl<TypeElement>('MUR', { nonNullable: true, validators: [Validators.required] }),
      etatElement: new FormControl<EtatElement>('BON', { nonNullable: true }),
      description: new FormControl('', { nonNullable: true }),
      observation: new FormControl('', { nonNullable: true }),
    }));
  }

  removeElement(pieceIdx: number, elemIdx: number): void {
    this.getElements(pieceIdx).removeAt(elemIdx);
  }

  setElementEtat(pieceIdx: number, elemIdx: number, etat: EtatElement): void {
    this.getElements(pieceIdx).at(elemIdx).get('etatElement')?.setValue(etat);
  }

  roomIcon(nomPiece: string): string {
    const preset = this.roomPresets.find(p =>
      nomPiece.toLowerCase().includes(p.type.toLowerCase())
    );
    return preset?.icon ?? 'home';
  }

  etatClass(etat: EtatElement): string {
    switch (etat) {
      case 'BON': return 'etat-bon';
      case 'USAGE_NORMAL': return 'etat-usage';
      case 'MAUVAIS': return 'etat-mauvais';
      case 'HORS_SERVICE': return 'etat-hs';
      default: return '';
    }
  }

  etatLabel(etat: EtatElement): string {
    const opt = this.etatOptions.find(o => o.value === etat);
    return opt?.label ?? etat;
  }

  meterIcon(type: TypeCompteur): string {
    return this.typeCompteurOptions.find(o => o.value === type)?.icon ?? 'droplets';
  }

  typeElementLabel(value: TypeElement): string {
    return this.typeElementOptions.find(o => o.value === value)?.label ?? value;
  }

  private toIso(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onTypeChange(val: string): void { this.selectedType.set(val); }
  onMeteoChange(val: string): void { this.selectedMeteo.set(val === this.selectedMeteo() ? null : val); }
  onPresentsChange(vals: string[]): void { this.selectedPresents.set(vals); }

  next(): void {
    const step = this.currentStep();
    if (step === 0) {
      if (!this.locataireEmail()) {
        this.snackBar.open('Aucun locataire assigné à ce bien.', 'OK', { duration: 4000 });
        return;
      }
      if (this.step1.invalid) { this.step1.markAllAsTouched(); return; }
    }
    if (step === 3 && this.pieces.length === 0) {
      this.snackBar.open('Ajoutez au moins une pièce.', 'OK', { duration: 3000 });
      return;
    }
    if (step < 3) this.currentStep.set(step + 1);
  }

  prev(): void {
    const step = this.currentStep();
    if (step > 0) this.currentStep.set(step - 1);
  }

  cancel(): void {
    this.gestion.activeView.set(null);
  }

  submit(): void {
    const email = this.locataireEmail();
    if (!email) {
      this.snackBar.open('Aucun locataire assigné à ce bien.', 'Fermer', { duration: 4000 });
      return;
    }

    const bienId = this.bien()!.id;
    const s1 = this.step1.getRawValue();

    this.submitting.set(true);
    this.edlService.create({
      bienId,
      emailLocataire: email,
      type: this.selectedType() as EdlType,
      dateRealisation: s1.date ? this.toIso(s1.date) : '',
      heureRealisation: s1.heure || undefined,
      observations: s1.observationsGenerales ?? undefined,
      compteurs: this.compteurs.getRawValue().map(c => ({
        typeCompteur: c.typeCompteur,
        numeroCompteur: c.numeroCompteur,
        index: c.index,
        unite: c.unite,
      })),
      cles: this.cles.getRawValue().map(c => ({
        typeCle: c.typeCle,
        quantite: c.quantite,
      })),
      pieces: this.pieces.getRawValue().map(p => ({
        nomPiece: p.nomPiece,
        ordre: p.ordre,
        observations: p.observations || undefined,
        elements: (p.elements as any[]).map((e: any) => ({
          typeElement: e.typeElement as TypeElement,
          etatElement: e.etatElement as EtatElement,
          description: e.description || undefined,
          observation: e.observation || undefined,
        })),
      })),
    }).subscribe({
      next: () => {
        this.snackBar.open('État des lieux créé — signez pour valider.', 'OK', { duration: 5000 });
        this.gestion.activeView.set(null);
      },
      error: () => {
        this.snackBar.open('Erreur lors de la création', 'Fermer', { duration: 4000 });
        this.submitting.set(false);
      },
    });
  }

}
