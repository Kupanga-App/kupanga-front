import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BienService } from '../../services/bien.service';
import { JuridictionService } from '../../services/juridiction.service';
import {
  BienFormDTO, BienType, ClasseEnergie, ClasseGes, Equipement, LIBELLES_CHAUFFAGE, LIBELLES_EQUIPEMENT, ModeChauffage, Pays, TYPES_BIEN,
  typeSansLogement,
} from '../../models/bien.model';
import { JuridictionConfig, PaysPrisEnCharge, champObligatoire, champVisible } from '../../models/juridiction.model';
import { Devise, LIBELLES_DEVISE, MontantPipe, symboleDevise } from '../../../../core/money/montant';
import { MOTIF_ADRESSE, MOTIF_ADRESSE_RDC, MOTIF_TITRE, MOTIF_VILLE } from '../../models/motifs';
import { ACCEPT_PHOTOS, NB_MAX_PHOTOS, PhotoRefuseeError, preparerPhoto, verifierLotPhotos } from '../../../../core/media/photos';
import { messageErreurApi } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/ui/toast.service';
import { DateLonguePipe, aujourdhuiIso } from '../../../../shared/format';
import { AssistantComponent } from '../../../../shared/ui/assistant.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { CarteRepereComponent, Repere } from '../../../../shared/components/carte-repere/carte-repere.component';

const ETAPES = [
  'Dans quel pays ?',
  'Quel type de bien ?',
  'Adresse',
  'Position sur la carte',
  'Caractéristiques',
  'Loyer et conditions',
  'Photos',
  'Vérifiez et publiez',
];

const AIDES: (string | null)[] = [
  'Les champs et les devises proposés dépendent du pays.',
  null,
  null,
  'Facultatif : placez le repère à l’emplacement exact. Sans repère, la position est déduite de l’adresse.',
  null,
  null,
  'Facultatif : 20 photos au maximum. Elles sont réduites avant l’envoi.',
  'Le bien sera publié dans les annonces.',
];

/**
 * Création d'un bien pas à pas (AUDIT.md §8.3). Le formulaire suit la configuration du pays
 * (`GET /juridictions/{pays}`, J6) : champs obligatoires et masqués, devises, types, équipements ; l'API revalide.
 */
@Component({
  selector: 'app-bien-create',
  standalone: true,
  imports: [ReactiveFormsModule, MontantPipe, DateLonguePipe, AssistantComponent, IconComponent, CarteRepereComponent],
  templateUrl: './bien-create.component.html',
  styleUrl: './bien-create.component.scss',
})
export class BienCreateComponent {
  private fb = inject(FormBuilder);
  private bienService = inject(BienService);
  private juridictions = inject(JuridictionService);
  private router = inject(Router);
  private toasts = inject(ToastService);

  readonly etapes = ETAPES;
  readonly aides = AIDES;
  readonly etape = signal(0);
  readonly aujourdhui = aujourdhuiIso();
  readonly acceptPhotos = ACCEPT_PHOTOS;
  readonly nbMaxPhotos = NB_MAX_PHOTOS;
  readonly libellesDevise = LIBELLES_DEVISE;
  readonly libellesEquipement = LIBELLES_EQUIPEMENT;
  readonly chauffages = Object.entries(LIBELLES_CHAUFFAGE) as [ModeChauffage, string][];
  readonly classes: ClasseEnergie[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  readonly paysOptions = signal<PaysPrisEnCharge[]>([]);
  readonly config = signal<JuridictionConfig | null>(null);
  readonly erreurConfig = signal<string | null>(null);
  readonly erreur = signal<string | null>(null);
  readonly envoi = signal(false);
  readonly preparation = signal(false);
  readonly photos = signal<File[]>([]);
  readonly apercus = signal<string[]>([]);
  readonly repere = signal<Repere | null>(null);
  readonly equipements = signal<Equipement[]>([]);

  readonly form = this.fb.group({
    pays: [null as Pays | null, Validators.required],
    typeBien: [null as BienType | null, Validators.required],
    titre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150), Validators.pattern(MOTIF_TITRE)]],
    description: ['', Validators.maxLength(1000)],
    adresse: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200), Validators.pattern(MOTIF_ADRESSE)]],
    ville: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(MOTIF_VILLE)]],
    codePostal: ['', [Validators.pattern(/^[0-9A-Z\- ]{3,10}$/)]],
    commune: ['', [Validators.maxLength(100), Validators.pattern(MOTIF_ADRESSE_RDC)]],
    quartier: ['', [Validators.maxLength(100), Validators.pattern(MOTIF_ADRESSE_RDC)]],
    avenue: ['', [Validators.maxLength(150), Validators.pattern(MOTIF_ADRESSE_RDC)]],
    numeroParcelle: ['', [Validators.maxLength(50), Validators.pattern(MOTIF_ADRESSE_RDC)]],
    pointDeRepere: ['', [Validators.maxLength(255)]],
    surfaceHabitable: [null as number | null, [Validators.min(9)]],
    nombrePieces: [null as number | null, [Validators.min(1)]],
    nombreChambres: [null as number | null, [Validators.min(0)]],
    etage: [null as number | null, [Validators.min(0)]],
    ascenseur: [false],
    anneeConstruction: [null as number | null, [Validators.min(1800), Validators.max(2100)]],
    modeChauffage: [null as ModeChauffage | null],
    classeEnergie: [null as ClasseEnergie | null],
    classeGes: [null as ClasseGes | null],
    heuresElectriciteParJour: [null as number | null, [Validators.min(0), Validators.max(24)]],
    meuble: [false],
    colocation: [false],
    devise: [null as Devise | null, Validators.required],
    loyerMensuel: [null as number | null, [Validators.required, Validators.min(1)]],
    chargesMensuelles: [0 as number | null, [Validators.required, Validators.min(0)]],
    depotGarantie: [null as number | null, [Validators.min(0)]],
    garantieMois: [null as number | null, [Validators.min(0), Validators.max(24)]],
    avanceMois: [null as number | null, [Validators.min(0), Validators.max(24)]],
    disponibleDe: [this.aujourdhui, Validators.required],
  });

  private readonly valeurs = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly typesDuPays = computed(() => {
    const types = this.config()?.typesBien;
    return types ? TYPES_BIEN.filter(t => types.includes(t.value)) : [];
  });
  readonly devisesDuPays = computed(() => this.config()?.devises ?? []);
  readonly equipementsDuPays = computed(() => this.config()?.equipements ?? []);
  readonly sansLogement = computed(() => typeSansLogement(this.valeurs().typeBien));
  readonly symbole = computed(() => symboleDevise(this.valeurs().devise));
  readonly libelleType = computed(() => TYPES_BIEN.find(t => t.value === this.valeurs().typeBien)?.label ?? '');
  readonly libellePays = computed(() => this.paysOptions().find(p => p.pays === this.valeurs().pays)?.libelle ?? '');

  /** Champs contrôlés à chaque étape (les champs masqués du pays sont vides et sans contrainte). */
  private readonly champsParEtape: (keyof typeof this.form.controls)[][] = [
    ['pays'],
    ['typeBien', 'titre', 'description'],
    ['adresse', 'ville', 'codePostal', 'commune', 'quartier', 'avenue', 'numeroParcelle', 'pointDeRepere'],
    [],
    ['surfaceHabitable', 'nombrePieces', 'nombreChambres', 'etage', 'anneeConstruction', 'heuresElectriciteParJour'],
    ['devise', 'loyerMensuel', 'chargesMensuelles', 'depotGarantie', 'garantieMois', 'avanceMois', 'disponibleDe'],
    [],
    [],
  ];

  readonly etapeValide = computed(() => {
    this.valeurs();
    const e = this.etape();
    if (e === 0 && !this.config()) return false;
    if (e === 6 && this.preparation()) return false;
    return this.champsParEtape[e].every(c => this.form.controls[c].valid);
  });

  constructor() {
    this.chargerPays();
    const destroyRef = inject(DestroyRef);
    this.form.controls.pays.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(pays => this.chargerConfiguration(pays));
    // C10 : surface et pièces exigées, sauf pour une parcelle ou un terrain
    this.form.controls.typeBien.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(type => {
      for (const champ of ['surfaceHabitable', 'nombrePieces'] as const) {
        const c = this.form.controls[champ];
        if (typeSansLogement(type)) c.removeValidators(Validators.required);
        else c.addValidators(Validators.required);
        c.updateValueAndValidity({ emitEvent: false });
      }
    });
    destroyRef.onDestroy(() => this.apercus().forEach(u => URL.revokeObjectURL(u)));
  }

  visible(champ: string): boolean {
    return champVisible(this.config(), champ);
  }

  obligatoire(champ: string): boolean {
    return champObligatoire(this.config(), champ);
  }

  private chargerPays(): void {
    this.erreurConfig.set(null);
    this.juridictions.paysPrisEnCharge().subscribe({
      next: pays => {
        this.paysOptions.set(pays);
        if (pays.length === 1 && !this.form.controls.pays.value) this.form.controls.pays.setValue(pays[0].pays);
      },
      error: () => this.erreurConfig.set('La liste des pays n’a pas pu être chargée. Vérifiez votre connexion.'),
    });
  }

  private chargerConfiguration(pays: Pays | null): void {
    this.config.set(null);
    this.erreurConfig.set(null);
    if (!pays) return;
    this.juridictions.configuration(pays).subscribe({
      next: config => {
        if (this.form.controls.pays.value !== pays) return;
        this.config.set(config);
        this.appliquerConfiguration(config);
      },
      error: () => this.erreurConfig.set('Les règles de ce pays n’ont pas pu être chargées. Vérifiez votre connexion.'),
    });
  }

  reessayer(): void {
    if (!this.paysOptions().length) this.chargerPays();
    this.chargerConfiguration(this.form.controls.pays.value);
  }

  /** J4/J6 : champs obligatoires exigés, champs masqués vidés (l'API les refuserait), devise et type du pays. */
  private appliquerConfiguration(config: JuridictionConfig): void {
    const c = this.form.controls;
    for (const champ of ['codePostal', 'commune', 'quartier', 'depotGarantie', 'garantieMois', 'avanceMois'] as const) {
      if (champObligatoire(config, champ)) c[champ].addValidators(Validators.required);
      else c[champ].removeValidators(Validators.required);
      c[champ].updateValueAndValidity({ emitEvent: false });
    }
    const masquables = [
      'codePostal', 'commune', 'quartier', 'avenue', 'numeroParcelle', 'pointDeRepere', 'classeEnergie', 'classeGes',
      'heuresElectriciteParJour', 'depotGarantie', 'garantieMois', 'avanceMois',
    ] as const;
    for (const champ of masquables) {
      if (!champVisible(config, champ)) c[champ].setValue(null as never, { emitEvent: false });
    }
    this.equipements.update(liste => liste.filter(e => config.equipements.includes(e)));
    if (!c.devise.value || !config.devises.includes(c.devise.value)) c.devise.setValue(config.deviseDefaut);
    if (c.typeBien.value && !config.typesBien.includes(c.typeBien.value)) c.typeBien.setValue(null);
    this.form.updateValueAndValidity();
  }

  basculerEquipement(e: Equipement): void {
    this.equipements.update(liste => (liste.includes(e) ? liste.filter(x => x !== e) : [...liste, e]));
  }

  async ajouterPhotos(event: Event): Promise<void> {
    const champ = event.target as HTMLInputElement;
    const fichiers = Array.from(champ.files ?? []);
    champ.value = '';
    if (!fichiers.length) return;
    const refusees: string[] = [];
    const acceptees: File[] = [];
    // HEIC (iPhone) converti en JPEG, photos réduites à 1600 px ; format et taille contrôlés avant l'envoi (B5, R1)
    this.preparation.set(true);
    for (const f of fichiers) {
      try {
        acceptees.push(await preparerPhoto(f));
      } catch (e) {
        refusees.push(e instanceof PhotoRefuseeError ? e.message : `« ${f.name} » ne peut pas être utilisée.`);
      }
    }
    this.preparation.set(false);
    const place = NB_MAX_PHOTOS - this.photos().length;
    if (acceptees.length > place) {
      refusees.push(`${NB_MAX_PHOTOS} photos au maximum : ${acceptees.length - Math.max(place, 0)} ignorée(s).`);
      acceptees.splice(Math.max(place, 0));
    }
    if (refusees.length) this.toasts.erreur(refusees.join(' '));
    if (acceptees.length) {
      this.photos.update(p => [...p, ...acceptees]);
      this.apercus.update(a => [...a, ...acceptees.map(f => URL.createObjectURL(f))]);
    }
  }

  retirerPhoto(i: number): void {
    URL.revokeObjectURL(this.apercus()[i]);
    this.photos.update(p => p.filter((_, j) => j !== i));
    this.apercus.update(a => a.filter((_, j) => j !== i));
  }

  precedent(): void {
    this.erreur.set(null);
    this.etape.update(e => Math.max(0, e - 1));
  }

  suivant(): void {
    this.champsParEtape[this.etape()].forEach(c => this.form.controls[c].markAsTouched());
    if (!this.etapeValide()) return;
    if (this.etape() < ETAPES.length - 1) {
      this.etape.update(e => e + 1);
      return;
    }
    this.publier();
  }

  quitter(): void {
    void this.router.navigate(['/biens']);
  }

  /** Nombre à envoyer, ou rien s'il est vide ou sans objet dans le pays (un champ masqué envoyé → 400). */
  private nombre(champ: string, valeur: number | null | undefined): number | undefined {
    return valeur != null && (valeur as unknown) !== '' && this.visible(champ) ? Number(valeur) : undefined;
  }

  private texte(champ: string, valeur: string | null | undefined): string | undefined {
    const t = (valeur ?? '').trim();
    return t && this.visible(champ) ? t : undefined;
  }

  private publier(): void {
    try {
      verifierLotPhotos(this.photos());
    } catch (e) {
      this.erreur.set((e as Error).message);
      return;
    }
    const v = this.form.getRawValue();
    const dto: BienFormDTO = {
      titre: v.titre!.trim(),
      typeBien: v.typeBien!,
      description: v.description?.trim() || undefined,
      pays: v.pays!,
      adresse: v.adresse!.trim(),
      ville: v.ville!.trim(),
      codePostal: this.texte('codePostal', v.codePostal),
      commune: this.texte('commune', v.commune),
      quartier: this.texte('quartier', v.quartier),
      avenue: this.texte('avenue', v.avenue),
      numeroParcelle: this.texte('numeroParcelle', v.numeroParcelle),
      pointDeRepere: this.texte('pointDeRepere', v.pointDeRepere),
      latitude: this.repere()?.latitude,
      longitude: this.repere()?.longitude,
      surfaceHabitable: this.nombre('surfaceHabitable', v.surfaceHabitable),
      nombrePieces: this.nombre('nombrePieces', v.nombrePieces),
      nombreChambres: this.nombre('nombreChambres', v.nombreChambres),
      etage: this.nombre('etage', v.etage),
      ascenseur: v.ascenseur ?? undefined,
      anneeConstruction: this.nombre('anneeConstruction', v.anneeConstruction),
      modeChauffage: v.modeChauffage || undefined,
      classeEnergie: this.visible('classeEnergie') ? v.classeEnergie || undefined : undefined,
      classeGes: this.visible('classeGes') ? v.classeGes || undefined : undefined,
      heuresElectriciteParJour: this.nombre('heuresElectriciteParJour', v.heuresElectriciteParJour),
      equipements: this.equipements().length ? this.equipements() : undefined,
      meuble: !!v.meuble,
      colocation: !!v.colocation,
      devise: v.devise ?? undefined,
      loyerMensuel: Number(v.loyerMensuel),
      chargesMensuelles: Number(v.chargesMensuelles ?? 0),
      depotGarantie: this.nombre('depotGarantie', v.depotGarantie),
      garantieMois: this.nombre('garantieMois', v.garantieMois),
      avanceMois: this.nombre('avanceMois', v.avanceMois),
      disponibleDe: v.disponibleDe!,
    };
    this.envoi.set(true);
    this.erreur.set(null);
    this.bienService.create({ bienFormDTO: dto, files: this.photos() }).subscribe({
      next: () => {
        this.toasts.ok('Bien publié.');
        void this.router.navigate(['/biens'], { replaceUrl: true });
      },
      error: err => {
        this.envoi.set(false);
        // 400 (formulaire, plus de 20 photos), 413 (taille), 415 (format), 429
        this.erreur.set(messageErreurApi(err, 'Le bien n’a pas pu être publié.'));
      },
    });
  }
}
