import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CarteRepereComponent, Repere } from '../../../../shared/components/carte-repere/carte-repere.component';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  Pays,
  Equipement,
  LIBELLES_EQUIPEMENT,
  TYPES_BIEN,
  typeSansLogement,
} from '../../models/bien.model';
import { JuridictionConfig, PaysPrisEnCharge, champObligatoire, champVisible } from '../../models/juridiction.model';
import { JuridictionService } from '../../services/juridiction.service';
import { Devise, LIBELLES_DEVISE, SymboleDevisePipe } from '../../../../core/money/montant';
import { messageErreurApi } from '../../../../core/http/api-error';
import {
  ACCEPT_PHOTOS,
  NB_MAX_PHOTOS,
  PhotoRefuseeError,
  preparerPhoto,
  verifierLotPhotos,
} from '../../../../core/media/photos';

@Component({
  selector: 'app-bien-create',
  standalone: true,
  imports: [
    CommonModule,
    CarteRepereComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatStepperModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule, SymboleDevisePipe
  ],
  templateUrl: './bien-create.component.html',
  styleUrls: ['./bien-create.component.scss'],
})
export class BienCreateComponent {
  private fb = inject(FormBuilder);
  private bienService = inject(BienService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // B3/B5 : mêmes règles que l'API (10 Mo par photo, 50 Mo et 20 photos par bien, formats des smartphones)
  readonly acceptPhotos = ACCEPT_PHOTOS;
  readonly nbMaxPhotos = NB_MAX_PHOTOS;
  isPreparing = signal<boolean>(false);

  currentStep = signal<number>(1);
  selectedFiles = signal<File[]>([]);
  previewUrls = signal<string[]>([]);
  /** C2 : repère placé sur la carte (facultatif). */
  readonly repere = signal<Repere | null>(null);
  isSubmitting = signal<boolean>(false);

  totalSizeMb = computed(() =>
    (this.selectedFiles().reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)
  );

  readonly today = new Date();

  readonly bienTypes = TYPES_BIEN;
  readonly libellesEquipement = LIBELLES_EQUIPEMENT;
  /** C11 : équipements cochés. */
  readonly equipementsChoisis = signal<Equipement[]>([]);

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
  private juridictionService = inject(JuridictionService);
  /** J6 : pays pris en charge, servis par l'API (`GET /juridictions`). */
  readonly paysOptions = signal<PaysPrisEnCharge[]>([]);
  /** J6 : configuration du pays choisi (`GET /juridictions/{pays}`) ; null pendant le chargement. */
  readonly config = signal<JuridictionConfig | null>(null);
  readonly erreurConfig = signal<string | null>(null);

  step1Form = this.fb.group({
    titre:             ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    typeBien:          [null as BienType | null, Validators.required],
    description:       ['', Validators.maxLength(1000)],
    /** J3 : devise des montants, parmi celles du pays (défaut du pays au départ). */
    devise:            ['EUR' as Devise | null, Validators.required],
    loyerMensuel:      [null as number | null, [Validators.required, Validators.min(1)]],
    chargesMensuelles: [null as number | null, [Validators.required, Validators.min(0)]],
    // C12 : obligatoire en France, masqué en RDC (garantie et avance en mois) : selon la configuration du pays
    depotGarantie:     [null as number | null, [Validators.min(0)]],
    garantieMois:      [null as number | null, [Validators.min(0), Validators.max(24)]],
    avanceMois:        [null as number | null, [Validators.min(0), Validators.max(24)]],
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
    /** C11 : heures de courant par jour (RDC). */
    heuresElectriciteParJour: [null as number | null, [Validators.min(0), Validators.max(24)]],
  });

  /** C10 : surface et pièces exigées sauf pour une parcelle ou un terrain. */
  private readonly _surfaceSelonType = this.step1Form.controls.typeBien.valueChanges
    .pipe(takeUntilDestroyed())
    .subscribe(type => {
      for (const champ of ['surfaceHabitable', 'nombrePieces'] as const) {
        const control = this.step2Form.controls[champ];
        if (typeSansLogement(type)) control.removeValidators(Validators.required);
        else control.addValidators(Validators.required);
        control.updateValueAndValidity({ emitEvent: false });
      }
    });

  readonly sansLogement = toSignal(this.step1Form.controls.typeBien.valueChanges.pipe(map(typeSansLogement)),
    { initialValue: false });

  /** C11 : équipements proposés dans le pays choisi. */
  readonly equipementsDuPays = computed(() => this.config()?.equipements ?? []);

  basculerEquipement(equipement: Equipement, coche: boolean): void {
    this.equipementsChoisis.update(liste =>
      coche ? [...liste.filter(e => e !== equipement), equipement] : liste.filter(e => e !== equipement));
  }

  step3Form = this.fb.group({
    adresse:    ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200), Validators.pattern(/\d/)]],
    ville:      ['', [Validators.required, Validators.minLength(2)]],
    // J4 : obligatoire ou masqué selon le pays (cf. appliquerChampsDuPays)
    codePostal: ['', [Validators.pattern(/^[0-9A-Z\- ]{3,10}$/)]],
    pays:       ['FR' as Pays, [Validators.required]],
    // J4 (C1) : adresse congolaise
    commune:        ['', [Validators.maxLength(100)]],
    quartier:       ['', [Validators.maxLength(100)]],
    avenue:         ['', [Validators.maxLength(150)]],
    numeroParcelle: ['', [Validators.maxLength(50)]],
    pointDeRepere:  ['', [Validators.maxLength(255)]],
  });

  readonly libellesDevise = LIBELLES_DEVISE;
  /** J3/J6 : devises du pays choisi en tête du formulaire. */
  readonly devisesDuPays = computed(() => this.config()?.devises ?? []);
  /** J6 : types de bien proposés dans ce pays (tous tant que la configuration n'est pas chargée). */
  readonly typesDuPays = computed(() => {
    const types = this.config()?.typesBien;
    return types ? this.bienTypes.filter(t => types.includes(t.value)) : this.bienTypes;
  });
  readonly deviseChoisie = toSignal(this.step1Form.controls.devise.valueChanges,
    { initialValue: this.step1Form.controls.devise.value });

  /** J4 : champ affiché pour le pays choisi. */
  visible(champ: string): boolean {
    return champVisible(this.config(), champ);
  }

  /** J4 : champ obligatoire pour le pays choisi. */
  obligatoire(champ: string): boolean {
    return champObligatoire(this.config(), champ);
  }

  /**
   * J4/J6 : selon la configuration du pays : champs obligatoires exigés, champs masqués vidés (l'API les
   * refuserait), devise par défaut du pays si l'actuelle n'y est pas acceptée, type de bien non proposé effacé.
   */
  private appliquerConfiguration(config: JuridictionConfig): void {
    const adresse = this.step3Form.controls;
    for (const champ of ['codePostal', 'commune', 'quartier'] as const) {
      const control = adresse[champ];
      if (champObligatoire(config, champ)) {
        control.addValidators(Validators.required);
      } else {
        control.removeValidators(Validators.required);
      }
      control.updateValueAndValidity({ emitEvent: false });
    }
    for (const champ of ['codePostal', 'commune', 'quartier', 'avenue', 'numeroParcelle', 'pointDeRepere'] as const) {
      if (!champVisible(config, champ)) adresse[champ].setValue('', { emitEvent: false });
    }
    for (const champ of ['classeEnergie', 'classeGes'] as const) {
      if (!champVisible(config, champ)) this.step2Form.controls[champ].setValue(null, { emitEvent: false });
    }
    // C12 : dépôt en montant (France) ou garantie et avance en mois (RDC)
    for (const champ of ['depotGarantie', 'garantieMois', 'avanceMois'] as const) {
      const control = this.step1Form.controls[champ];
      if (champObligatoire(config, champ)) control.addValidators(Validators.required);
      else control.removeValidators(Validators.required);
      if (!champVisible(config, champ)) control.setValue(null, { emitEvent: false });
      control.updateValueAndValidity({ emitEvent: false });
    }
    if (!champVisible(config, 'heuresElectriciteParJour')) {
      this.step2Form.controls.heuresElectriciteParJour.setValue(null, { emitEvent: false });
    }
    this.equipementsChoisis.update(liste => liste.filter(e => config.equipements.includes(e)));
    const devise = this.step1Form.controls.devise;
    if (!devise.value || !config.devises.includes(devise.value)) {
      devise.setValue(config.deviseDefaut);
    }
    const type = this.step1Form.controls.typeBien;
    if (type.value && !config.typesBien.includes(type.value)) {
      type.setValue(null);
    }
  }

  /** J6 : charge la configuration du pays choisi, puis l'applique au formulaire. */
  private chargerConfiguration(pays: Pays | null): void {
    this.config.set(null);
    this.erreurConfig.set(null);
    if (!pays) return;
    this.juridictionService.configuration(pays).subscribe({
      next: config => {
        if (this.step3Form.controls.pays.value !== pays) return; // pays changé entre-temps
        this.config.set(config);
        this.appliquerConfiguration(config);
      },
      error: () => this.erreurConfig.set(
        'Impossible de charger les règles de ce pays. Vérifiez votre connexion puis réessayez.'),
    });
  }

  /** C11/C12 : nombre à envoyer, ou rien s'il est vide ou sans objet pour le pays (l'API refuserait un champ masqué). */
  private nombreVisible(champ: string, valeur: number | null | undefined): number | undefined {
    return valeur != null && this.visible(champ) ? Number(valeur) : undefined;
  }

  /** J4 : texte à envoyer, ou rien s'il est vide ou sans objet pour le pays. */
  private texte(champ: 'codePostal' | 'commune' | 'quartier' | 'avenue' | 'numeroParcelle' | 'pointDeRepere'): string | undefined {
    const valeur = (this.step3Form.controls[champ].value ?? '').trim();
    return valeur && this.visible(champ) ? valeur : undefined;
  }

  /** J6 : liste des pays ; une erreur (réseau, 5xx, 429) affiche un message et un bouton « Réessayer ». */
  private chargerPays(): void {
    this.juridictionService.paysPrisEnCharge().subscribe({
      next: pays => this.paysOptions.set(pays),
      error: () => this.erreurConfig.set(
        'Impossible de charger la liste des pays. Vérifiez votre connexion puis réessayez.'),
    });
  }

  /** J6 : nouvel essai après une erreur de chargement des pays ou de la configuration. */
  reessayerConfiguration(): void {
    if (this.paysOptions().length === 0) this.chargerPays();
    this.chargerConfiguration(this.step3Form.controls.pays.value);
  }

  constructor() {
    this.chargerPays();
    this.chargerConfiguration(this.step3Form.controls.pays.value);
    this.step3Form.controls.pays.valueChanges.subscribe(pays => this.chargerConfiguration(pays));
  }

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

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const files = Array.from(input.files);
    input.value = '';

    const rejected: string[] = [];
    const accepted: File[] = [];

    // HEIC (iPhone) converti en JPEG ; format et taille contrôlés avant l'envoi
    this.isPreparing.set(true);
    for (const file of files) {
      try {
        accepted.push(await preparerPhoto(file));
      } catch (e) {
        rejected.push(e instanceof PhotoRefuseeError ? e.message : `« ${file.name} » ne peut pas être utilisée.`);
      }
    }
    this.isPreparing.set(false);

    const place = NB_MAX_PHOTOS - this.selectedFiles().length;
    if (accepted.length > place) {
      rejected.push(`${NB_MAX_PHOTOS} photos au maximum par bien : ${accepted.length - Math.max(place, 0)} photo(s) ignorée(s).`);
      accepted.splice(Math.max(place, 0));
    }

    if (rejected.length > 0) {
      this.snackBar.open(`Photo(s) refusée(s) : ${rejected.join(' ')}`, 'Fermer', {
        duration: 8000,
        panelClass: 'kp-snack-error',
      });
    }

    if (accepted.length > 0) {
      this.selectedFiles.update(files => [...files, ...accepted]);
      accepted.forEach(file =>
        this.previewUrls.update(urls => [...urls, URL.createObjectURL(file)])
      );
    }
  }

  removeFile(index: number): void {
    URL.revokeObjectURL(this.previewUrls()[index]);
    this.selectedFiles.update(prev => prev.filter((_, i) => i !== index));
    this.previewUrls.update(prev => prev.filter((_, i) => i !== index));
  }

  onSubmit(): void {
    if (this.selectedFiles().length === 0 || this.isSubmitting() || this.isPreparing()) return;
    if (!this.config()) {
      // J6 : les champs à envoyer dépendent des règles du pays, pas encore chargées
      this.snackBar.open(this.erreurConfig() ?? 'Règles du pays en cours de chargement, réessayez dans un instant.',
        'Fermer', { duration: 6000, panelClass: ['snack-error'] });
      return;
    }

    try {
      verifierLotPhotos(this.selectedFiles());
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Fermer', { duration: 6000, panelClass: ['snack-error'] });
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
      depotGarantie:     this.nombreVisible('depotGarantie', this.step1Form.value.depotGarantie),
      garantieMois:      this.nombreVisible('garantieMois', this.step1Form.value.garantieMois),
      avanceMois:        this.nombreVisible('avanceMois', this.step1Form.value.avanceMois),
      heuresElectriciteParJour: this.nombreVisible('heuresElectriciteParJour', s2.heuresElectriciteParJour),
      equipements:       this.equipementsChoisis().length ? this.equipementsChoisis() : undefined,
      meuble:            this.step1Form.value.meuble ?? false,
      colocation:        this.step1Form.value.colocation ?? false,
      disponibleDe:      d ? new Date(d).toISOString().split('T')[0] : '',
      surfaceHabitable:  s2.surfaceHabitable != null ? Number(s2.surfaceHabitable) : undefined,
      nombrePieces:      s2.nombrePieces != null ? Number(s2.nombrePieces) : undefined,
      nombreChambres:    s2.nombreChambres != null ? Number(s2.nombreChambres) : undefined,
      etage:             s2.etage != null ? Number(s2.etage) : undefined,
      ascenseur:         s2.ascenseur ?? undefined,
      anneeConstruction: s2.anneeConstruction != null ? Number(s2.anneeConstruction) : undefined,
      modeChauffage:     (s2.modeChauffage as ModeChauffage) || undefined,
      classeEnergie:     this.visible('classeEnergie') ? (s2.classeEnergie as ClasseEnergie) || undefined : undefined,
      classeGes:         this.visible('classeGes') ? (s2.classeGes as ClasseGes) || undefined : undefined,
      adresse:           this.step3Form.value.adresse!,
      ville:             this.step3Form.value.ville!,
      codePostal:        this.texte('codePostal'),
      pays:              this.step3Form.value.pays!,
      commune:           this.texte('commune'),
      quartier:          this.texte('quartier'),
      avenue:            this.texte('avenue'),
      numeroParcelle:    this.texte('numeroParcelle'),
      pointDeRepere:     this.texte('pointDeRepere'),
      latitude:          this.repere()?.latitude,
      longitude:         this.repere()?.longitude,
      devise:            this.step1Form.value.devise ?? undefined,
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
        // 400 (formulaire, plus de 20 photos), 413 (taille), 415 (format), 429
        const parDefaut = err.status === 403 ? 'Accès refusé' : 'Une erreur inattendue est survenue.';
        this.snackBar.open(messageErreurApi(err, parDefaut), 'Fermer', { duration: 6000, panelClass: ['snack-error'] });
      },
    });
  }
}
