import { CarteRepereComponent, Repere } from '../../../../shared/components/carte-repere/carte-repere.component';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Devise, LIBELLES_DEVISE, SymboleDevisePipe } from '../../../../core/money/montant';
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
  ModeChauffage, PAYS_OPTIONS, Pays, adresseLisible, positionApproximative, TYPES_BIEN, LIBELLES_EQUIPEMENT, Equipement } from '../../models/bien.model';
import { JuridictionConfig, champVisible } from '../../models/juridiction.model';
import { JuridictionService } from '../../services/juridiction.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { messageErreurApi } from '../../../../core/http/api-error';

@Component({
  selector: 'kp-bien-edit',
  standalone: true,
  imports: [
    CarteRepereComponent,
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
    IconComponent, SymboleDevisePipe
  ],
  templateUrl: './bien-edit.component.html',
  styleUrls: ['./bien-edit.component.scss'],
})
export class BienEditComponent implements OnInit {
  readonly paysOptions = PAYS_OPTIONS;
  private fb = inject(FormBuilder);
  private bienService = inject(BienService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private snackBar = inject(MatSnackBar);

  bien = signal<BienDTO | null>(null);
  /** C2 : nouveau repère choisi sur la carte (null = position inchangée). */
  readonly repereDeplace = signal<Repere | null>(null);

  /** Position actuelle du bien, point de départ de la carte. */
  repereActuel(): Repere | null {
    const b = this.bien();
    return b?.latitude != null && b?.longitude != null ? { latitude: b.latitude, longitude: b.longitude } : null;
  }

  readonly positionApproximative = positionApproximative;
  readonly libellesDevise = LIBELLES_DEVISE;
  /** J3 : devises du pays du bien (le pays n'est pas modifiable). */
  private juridictionService = inject(JuridictionService);
  /** J6 : configuration du pays du bien (`GET /juridictions/{pays}`), chargée avec le bien. */
  readonly config = signal<JuridictionConfig | null>(null);
  readonly devisesDuPays = computed(() => this.config()?.devises ?? []);
  /** J4 : DPE sans objet en RDC (l'API refuse en 400 une classe envoyée pour ce pays). */
  readonly dpeVisible = computed(() => !!this.config() && champVisible(this.config(), 'classeEnergie'));
  /** J6 : types de bien proposés dans le pays du bien (l'API refuse les autres) ; type actuel toujours affiché. */
  readonly typesDuPays = computed(() => {
    const types = this.config()?.typesBien;
    const actuel = this.bien()?.typeBien;
    return types ? this.bienTypes.filter(t => types.includes(t.value) || t.value === actuel) : this.bienTypes;
  });
  /** J4 : adresse complète (dont l'adresse congolaise), non modifiable. */
  readonly adresseComplete = computed(() => { const b = this.bien(); return b ? adresseLisible(b) : ''; });
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

  readonly bienTypes = TYPES_BIEN;
  readonly libellesEquipement = LIBELLES_EQUIPEMENT;
  /** C11 : équipements cochés (liste complète envoyée). */
  readonly equipementsChoisis = signal<Equipement[]>([]);
  readonly equipementsDuPays = computed(() => this.config()?.equipements ?? []);
  /** C12 : champ du pays (dépôt en montant en France, garantie et avance en mois en RDC). */
  champDuPays(champ: string): boolean {
    return !!this.config() && champVisible(this.config(), champ);
  }

  basculerEquipement(equipement: Equipement, coche: boolean): void {
    this.equipementsChoisis.update(liste =>
      coche ? [...liste.filter(e => e !== equipement), equipement] : liste.filter(e => e !== equipement));
  }

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
    /** J3 : devise modifiable parmi celles du pays (les baux et quittances déjà créés gardent la leur). */
    devise:            [null as Devise | null],
    loyerMensuel:      [null as number | null, [Validators.required, Validators.min(1)]],
    chargesMensuelles: [null as number | null, [Validators.required, Validators.min(0)]],
    depotGarantie:     [null as number | null, [Validators.min(0)]],
    garantieMois:      [null as number | null, [Validators.min(0), Validators.max(24)]],
    avanceMois:        [null as number | null, [Validators.min(0), Validators.max(24)]],
    meuble:            [false],
    colocation:        [false],
    disponibleDe:      [null as Date | null, Validators.required],
  });

  step2Form = this.fb.group({
    // C10 : facultatifs pour une parcelle ou un terrain (absents = inchangés côté API)
    surfaceHabitable:  [null as number | null, [Validators.min(9)]],
    nombrePieces:      [null as number | null, [Validators.min(1)]],
    nombreChambres:    [null as number | null, Validators.min(0)],
    etage:             [null as number | null, Validators.min(0)],
    ascenseur:         [false],
    anneeConstruction: [null as number | null, [Validators.min(1800), Validators.max(2100)]],
    modeChauffage:     [null as ModeChauffage | null],
    classeEnergie:     [null as ClasseEnergie | null],
    classeGes:         [null as ClasseGes | null],
    heuresElectriciteParJour: [null as number | null, [Validators.min(0), Validators.max(24)]],
  });

  step3Form = this.fb.group({
    adresse:    ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200), Validators.pattern(/\d/)]],
    ville:      ['', [Validators.required, Validators.minLength(2)]],
    codePostal: ['', [Validators.required, Validators.pattern(/^[0-9A-Z\- ]{3,10}$/)]],
    pays:       ['FR' as Pays, [Validators.required]],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bienId.set(id);

    this.bienService.getPrive(id).subscribe({
      next: (data) => {
        if (data.archive) {
          // B12 : un bien archivé n'est plus modifiable (409 côté API)
          this.snackBar.open('Ce bien est archivé : il ne peut plus être modifié.', 'Fermer', { duration: 5000 });
          this.router.navigate(['/pro/biens', id]);
          return;
        }
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
    this.juridictionService.configuration(b.pays).subscribe({ next: config => this.config.set(config), error: () => undefined });
    this.step1Form.patchValue({
      titre:             b.titre,
      typeBien:          b.typeBien,
      description:       b.description ?? '',
      devise:            b.devise ?? null,
      loyerMensuel:      b.loyerMensuel ?? null,
      chargesMensuelles: b.chargesMensuelles ?? null,
      depotGarantie:     b.depotGarantie ?? null,
      garantieMois:      b.garantieMois ?? null,
      avanceMois:        b.avanceMois ?? null,
      meuble:            b.meuble ?? false,
      colocation:        b.colocation ?? false,
      disponibleDe:      b.disponibleDe ? new Date(b.disponibleDe) : null,
    });
    this.equipementsChoisis.set([...(b.equipements ?? [])]);
    this.step2Form.controls.heuresElectriciteParJour.setValue(b.heuresElectriciteParJour ?? null);

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
    // L'adresse et le pays ne sont pas modifiables (géocodage, juridiction figée sur les baux) : affichés seulement
    this.step3Form.disable();
  }

  scrollToSection(index: number): void {
    this.activeSection.set(index);
    const id = ['section-general', 'section-caracteristiques', 'section-loyer', 'section-localisation'][index];
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private nombreDuPays(champ: string, valeur: number | null | undefined): number | undefined {
    return valeur != null && this.champDuPays(champ) ? Number(valeur) : undefined;
  }

  onSubmit(): void {
    if (this.step1Form.invalid) { this.step1Form.markAllAsTouched(); return; }
    if (this.step2Form.invalid) { this.step2Form.markAllAsTouched(); return; }
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);

    const d = this.step1Form.controls.disponibleDe.value;
    const s2 = this.step2Form.value;

    const dto: Omit<BienFormDTO, 'adresse' | 'ville' | 'codePostal' | 'pays'> = {
      titre:             this.step1Form.value.titre!,
      typeBien:          this.step1Form.value.typeBien as BienType,
      description:       this.step1Form.value.description || undefined,
      loyerMensuel:      Number(this.step1Form.value.loyerMensuel),
      chargesMensuelles: Number(this.step1Form.value.chargesMensuelles),
      // C11/C12 : seulement les champs du pays (un champ masqué envoyé serait refusé en 400)
      depotGarantie:     this.nombreDuPays('depotGarantie', this.step1Form.value.depotGarantie),
      garantieMois:      this.nombreDuPays('garantieMois', this.step1Form.value.garantieMois),
      avanceMois:        this.nombreDuPays('avanceMois', this.step1Form.value.avanceMois),
      heuresElectriciteParJour: this.nombreDuPays('heuresElectriciteParJour', s2.heuresElectriciteParJour),
      equipements:       this.equipementsChoisis(),
      devise:            this.step1Form.value.devise ?? undefined,
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
      classeEnergie:     this.dpeVisible() ? (s2.classeEnergie as ClasseEnergie) || undefined : undefined,
      classeGes:         this.dpeVisible() ? (s2.classeGes as ClasseGes) || undefined : undefined,
      // C2 : repère envoyé seulement s'il a été déplacé (les POI sont alors recalculés)
      latitude:          this.repereDeplace()?.latitude,
      longitude:         this.repereDeplace()?.longitude,
    };

    this.bienService.update(this.bienId(), dto).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.snackBar.open('Bien mis à jour avec succès', 'Fermer', { duration: 4000 });
        this.router.navigate(['/pro/biens', this.bienId()]);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        // 400 formulaire, 403, 409 bien archivé (B12), 429
        const parDefaut = err.status === 403 ? 'Accès refusé' : 'Une erreur inattendue est survenue.';
        this.snackBar.open(messageErreurApi(err, parDefaut), 'Fermer', { duration: 5000 });
      },
    });
  }
}
