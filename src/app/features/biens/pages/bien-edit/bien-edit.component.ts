import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { BienService } from '../../services/bien.service';
import { JuridictionService } from '../../services/juridiction.service';
import {
  BienDTO, BienFormDTO, BienType, ClasseEnergie, ClasseGes, Equipement, LIBELLES_CHAUFFAGE, LIBELLES_EQUIPEMENT, ModeChauffage,
  TYPES_BIEN, adresseLisible, positionApproximative, typeSansLogement,
} from '../../models/bien.model';
import { JuridictionConfig, champVisible } from '../../models/juridiction.model';
import { Devise, LIBELLES_DEVISE, symboleDevise } from '../../../../core/money/montant';
import { messageErreurApi } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/ui/toast.service';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { VideComponent } from '../../../../shared/ui/vide.component';
import { CarteRepereComponent, Repere } from '../../../../shared/components/carte-repere/carte-repere.component';
import { MOTIF_TITRE } from '../../models/motifs';

/**
 * Modification d'un bien. L'adresse et le pays ne sont pas modifiables (géocodage, juridiction figée sur les baux) ;
 * le repère sur la carte peut être déplacé (C2). Bien archivé : lecture seule (B12).
 */
@Component({
  selector: 'app-bien-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, VideComponent, CarteRepereComponent],
  templateUrl: './bien-edit.component.html',
})
export class BienEditComponent implements OnInit {
  readonly id = input.required<string>();

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private bienService = inject(BienService);
  private juridictions = inject(JuridictionService);
  private toasts = inject(ToastService);

  readonly bien = signal<BienDTO | null>(null);
  readonly config = signal<JuridictionConfig | null>(null);
  readonly chargement = signal(true);
  readonly erreurChargement = signal<string | null>(null);
  readonly envoi = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly equipements = signal<Equipement[]>([]);
  /** C2 : nouveau repère (null = position inchangée). */
  readonly repereDeplace = signal<Repere | null>(null);

  readonly libellesDevise = LIBELLES_DEVISE;
  readonly libellesEquipement = LIBELLES_EQUIPEMENT;
  readonly chauffages = Object.entries(LIBELLES_CHAUFFAGE) as [ModeChauffage, string][];
  readonly classes: ClasseEnergie[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  readonly form = this.fb.group({
    titre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150), Validators.pattern(MOTIF_TITRE)]],
    typeBien: [null as BienType | null, Validators.required],
    description: ['', Validators.maxLength(1000)],
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
    devise: [null as Devise | null],
    loyerMensuel: [null as number | null, [Validators.required, Validators.min(1)]],
    chargesMensuelles: [null as number | null, [Validators.required, Validators.min(0)]],
    depotGarantie: [null as number | null, [Validators.min(0)]],
    garantieMois: [null as number | null, [Validators.min(0), Validators.max(24)]],
    avanceMois: [null as number | null, [Validators.min(0), Validators.max(24)]],
    disponibleDe: ['', Validators.required],
  });

  private readonly valeurs = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly symbole = computed(() => symboleDevise(this.valeurs().devise));
  readonly sansLogement = computed(() => typeSansLogement(this.valeurs().typeBien));
  readonly devisesDuPays = computed(() => this.config()?.devises ?? []);
  readonly equipementsDuPays = computed(() => this.config()?.equipements ?? []);
  readonly typesDuPays = computed(() => {
    const types = this.config()?.typesBien;
    const actuel = this.bien()?.typeBien;
    return types ? TYPES_BIEN.filter(t => types.includes(t.value) || t.value === actuel) : TYPES_BIEN;
  });
  readonly adresse = computed(() => {
    const b = this.bien();
    return b ? adresseLisible(b) : '';
  });
  readonly positionApprox = computed(() => positionApproximative(this.bien()?.precisionLocalisation));
  readonly repereActuel = computed<Repere | null>(() => {
    const b = this.bien();
    return b?.latitude != null && b?.longitude != null ? { latitude: b.latitude, longitude: b.longitude } : null;
  });

  visible(champ: string): boolean {
    return !!this.config() && champVisible(this.config(), champ);
  }

  ngOnInit(): void {
    const id = Number(this.id());
    this.bienService.getPrive(id).subscribe({
      next: b => {
        if (b.archive) {
          this.erreurChargement.set('Ce bien est archivé : il ne peut plus être modifié.');
          this.chargement.set(false);
          return;
        }
        this.bien.set(b);
        this.remplir(b);
        this.juridictions.configuration(b.pays).pipe(catchError(() => of(null))).subscribe(c => this.config.set(c));
        this.chargement.set(false);
      },
      error: err => {
        this.erreurChargement.set(messageErreurApi(err, 'Ce bien est introuvable.'));
        this.chargement.set(false);
      },
    });
  }

  private remplir(b: BienDTO): void {
    this.form.patchValue({
      titre: b.titre,
      typeBien: b.typeBien,
      description: b.description ?? '',
      surfaceHabitable: b.surfaceHabitable ?? null,
      nombrePieces: b.nombrePieces ?? null,
      nombreChambres: b.nombreChambres ?? null,
      etage: b.etage ?? null,
      ascenseur: b.ascenseur ?? false,
      anneeConstruction: b.anneeConstruction ?? null,
      modeChauffage: b.modeChauffage ?? null,
      classeEnergie: b.classeEnergie ?? null,
      classeGes: b.classeGes ?? null,
      heuresElectriciteParJour: b.heuresElectriciteParJour ?? null,
      meuble: b.meuble ?? false,
      colocation: b.colocation ?? false,
      devise: b.devise ?? null,
      loyerMensuel: b.loyerMensuel ?? null,
      chargesMensuelles: b.chargesMensuelles ?? null,
      depotGarantie: b.depotGarantie ?? null,
      garantieMois: b.garantieMois ?? null,
      avanceMois: b.avanceMois ?? null,
      disponibleDe: b.disponibleDe ?? '',
    });
    this.equipements.set([...(b.equipements ?? [])]);
  }

  basculerEquipement(e: Equipement): void {
    this.equipements.update(liste => (liste.includes(e) ? liste.filter(x => x !== e) : [...liste, e]));
  }

  /** C11/C12 : seulement les champs du pays (un champ masqué envoyé serait refusé en 400). */
  private nombre(champ: string, valeur: number | null | undefined): number | undefined {
    return valeur != null && (valeur as unknown) !== '' && this.visible(champ) ? Number(valeur) : undefined;
  }

  private entier(valeur: number | null | undefined): number | undefined {
    return valeur != null && (valeur as unknown) !== '' ? Number(valeur) : undefined;
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.erreur.set('Corrigez les champs signalés.');
      return;
    }
    const v = this.form.getRawValue();
    const dto: Partial<BienFormDTO> = {
      titre: v.titre!.trim(),
      typeBien: v.typeBien!,
      description: v.description?.trim() ?? '',
      surfaceHabitable: this.entier(v.surfaceHabitable),
      nombrePieces: this.entier(v.nombrePieces),
      nombreChambres: this.entier(v.nombreChambres),
      etage: this.entier(v.etage),
      ascenseur: v.ascenseur ?? undefined,
      anneeConstruction: this.entier(v.anneeConstruction),
      modeChauffage: v.modeChauffage || undefined,
      classeEnergie: this.visible('classeEnergie') ? v.classeEnergie || undefined : undefined,
      classeGes: this.visible('classeGes') ? v.classeGes || undefined : undefined,
      heuresElectriciteParJour: this.nombre('heuresElectriciteParJour', v.heuresElectriciteParJour),
      equipements: this.equipements(),
      meuble: !!v.meuble,
      colocation: !!v.colocation,
      devise: v.devise ?? undefined,
      loyerMensuel: Number(v.loyerMensuel),
      chargesMensuelles: Number(v.chargesMensuelles),
      depotGarantie: this.nombre('depotGarantie', v.depotGarantie),
      garantieMois: this.nombre('garantieMois', v.garantieMois),
      avanceMois: this.nombre('avanceMois', v.avanceMois),
      disponibleDe: v.disponibleDe!,
      // C2 : repère envoyé seulement s'il a été déplacé (les lieux proches sont alors recalculés)
      latitude: this.repereDeplace()?.latitude,
      longitude: this.repereDeplace()?.longitude,
    };
    this.envoi.set(true);
    this.erreur.set(null);
    this.bienService.update(Number(this.id()), dto).subscribe({
      next: () => {
        this.toasts.ok('Bien enregistré.');
        void this.router.navigate(['/biens', this.id()], { replaceUrl: true });
      },
      error: err => {
        this.envoi.set(false);
        // 400 formulaire, 409 bien archivé (B12), 429
        this.erreur.set(messageErreurApi(err, 'Les modifications n’ont pas été enregistrées.'));
      },
    });
  }
}
