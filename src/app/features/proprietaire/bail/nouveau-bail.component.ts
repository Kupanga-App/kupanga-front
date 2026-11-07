import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { BienService } from '../../biens/services/bien.service';
import { JuridictionService } from '../../biens/services/juridiction.service';
import { ContratService } from '../../gestion-logement/services/contrat.service';
import { BienDTO, adresseLisible, locataireDuBail } from '../../biens/models/bien.model';
import { champVisible } from '../../biens/models/juridiction.model';
import { MontantPipe, formatMontant, symboleDevise } from '../../../core/money/montant';
import { messageErreurApi } from '../../../core/http/api-error';
import { ToastService } from '../../../core/ui/toast.service';
import { DateLonguePipe, aujourdhuiIso, dateLongue } from '../../../shared/format';
import { AssistantComponent } from '../../../shared/ui/assistant.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { NgTemplateOutlet } from '@angular/common';

const ETAPES = ['Début et durée du bail', 'Loyer et garantie', 'Vérifiez le bail'];
const LIBELLES = ['Début et durée', 'Loyer et garantie', 'Vérification'];
const DUREES = [12, 24, 36];

const MANQUES_BAIL: Record<string, string> = {
  dateDebut: 'Choisissez la date de début du bail.',
  dureeBailMois: 'Indiquez une durée de 1 à 120 mois.',
  loyerMensuel: 'Indiquez le loyer hors charges.',
  chargesMensuelles: 'Indiquez les charges (0 s’il n’y en a pas).',
  depotGarantie: 'Indiquez le dépôt de garantie (0 s’il n’y en a pas).',
  garantieMois: 'Indiquez la garantie, de 0 à 24 mois.',
  avanceMois: 'Indiquez les loyers payés d’avance, de 0 à 24 mois.',
};

/** « 1 an », « 18 mois », « 2 ans ». */
export function libelleDuree(mois: number | null | undefined): string {
  const n = Number(mois);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n % 12 === 0) return n === 12 ? '1 an' : `${n / 12} ans`;
  return `${n} mois`;
}

/**
 * Création d'un bail en 3 étapes (`Assist-Bail`) ; la juridiction du bien dit si la garantie est en montant ou en
 * mois (C12). Aperçu en direct construit avec les valeurs du formulaire : parties, logement, durée, loyer et charges,
 * dépôt ou garantie et avance. Le texte complet du bail n'existe que dans le PDF (évolution E2).
 */
@Component({
  selector: 'kp-nouveau-bail',
  standalone: true,
  imports: [ReactiveFormsModule, NgTemplateOutlet, MontantPipe, DateLonguePipe, AssistantComponent, IconComponent],
  templateUrl: './nouveau-bail.component.html',
  styleUrl: './nouveau-bail.component.scss',
})
export class NouveauBailComponent implements OnInit {
  readonly id = input.required<string>();

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private bienService = inject(BienService);
  private juridictions = inject(JuridictionService);
  private contratService = inject(ContratService);
  private toasts = inject(ToastService);

  readonly etapes = ETAPES;
  readonly libelles = LIBELLES;
  readonly durees = DUREES;
  readonly aujourdhui = aujourdhuiIso();
  readonly etape = signal(0);
  readonly bien = signal<BienDTO | null>(null);
  readonly erreur = signal<string | null>(null);
  readonly envoi = signal(false);
  /** C12 : garantie en mois de loyer quand le pays masque le dépôt en montant (RDC). */
  readonly garantieEnMois = signal(false);

  readonly form = this.fb.group({
    dateDebut: [this.aujourdhui, Validators.required],
    dureeBailMois: [12, [Validators.required, Validators.min(1), Validators.max(120)]],
    loyerMensuel: [null as number | null, [Validators.required, Validators.min(0.01)]],
    chargesMensuelles: [0 as number | null, [Validators.required, Validators.min(0)]],
    depotGarantie: [null as number | null, [Validators.min(0)]],
    garantieMois: [null as number | null, [Validators.min(0), Validators.max(24)]],
    avanceMois: [null as number | null, [Validators.min(0), Validators.max(24)]],
  });

  protected readonly valeurs = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly devise = computed(() => this.bien()?.devise);
  readonly symbole = computed(() => symboleDevise(this.devise()));
  readonly nomLocataire = computed(() => {
    const l = locataireDuBail(this.bien());
    return l ? `${l.firstName} ${l.lastName}` : '';
  });
  readonly prenomLocataire = computed(() => locataireDuBail(this.bien())?.firstName ?? 'le locataire');
  readonly nomBailleur = computed(() => {
    const p = this.bien()?.proprietaire;
    return p ? `${p.firstName} ${p.lastName}` : '';
  });
  readonly adresseBien = computed(() => {
    const b = this.bien();
    return b ? adresseLisible(b) : '';
  });
  readonly sousTitre = computed(() => [this.nomLocataire(), this.bien()?.titre].filter(Boolean).join(' · ') || null);
  readonly duree = computed(() => libelleDuree(this.valeurs().dureeBailMois));
  readonly totalMensuel = computed(() => {
    const v = this.valeurs();
    return (Number(v.loyerMensuel) || 0) + (Number(v.chargesMensuelles) || 0);
  });
  /** Résumé des étapes passées, sous leur libellé. */
  readonly resumes = computed(() => {
    const v = this.valeurs();
    return [
      [dateLongue(v.dateDebut ?? null, true), this.duree()].filter(Boolean).join(' · '),
      formatMontant(this.totalMensuel(), this.devise(), 0) + ' par mois',
      null,
    ];
  });
  /**
   * Avertissement non bloquant : le dépôt saisi n'est pas celui de l'annonce. Aucun plafond légal n'est connu du
   * code (ni de `GET /juridictions/{pays}`) : la règle n'est pas inventée ici.
   */
  readonly depotDifferent = computed(() => {
    const annonce = this.bien()?.depotGarantie;
    const saisi = this.valeurs().depotGarantie;
    return !this.garantieEnMois() && annonce != null && saisi != null && (saisi as unknown) !== '' && Number(saisi) !== Number(annonce)
      ? formatMontant(annonce, this.devise(), 0) : null;
  });

  readonly montantGarantie = computed(() => {
    const v = this.valeurs();
    return (Number(v.loyerMensuel) || 0) * (Number(v.garantieMois) || 0);
  });

  private readonly champsParEtape = [
    ['dateDebut', 'dureeBailMois'],
    ['loyerMensuel', 'chargesMensuelles', 'depotGarantie', 'garantieMois', 'avanceMois'],
    [],
  ] as const;

  readonly etapeValide = computed(() => {
    this.valeurs();
    return this.champsParEtape[this.etape()].every(c => this.form.controls[c].valid);
  });

  /** Ce qui empêche de continuer, d'après les mêmes contrôles que `etapeValide`. */
  readonly manque = computed<string | null>(() => {
    this.valeurs();
    if (!this.bien()) return this.erreur() ? null : 'Chargement du bien…';
    const invalide = this.champsParEtape[this.etape()].find(c => this.form.controls[c].invalid);
    return invalide ? MANQUES_BAIL[invalide] : null;
  });

  /** Valeurs reprises du bien : la saisie commence quand elles changent. */
  private initiales: string | null = null;
  readonly modifie = computed(() => {
    const v = this.valeurs();
    return this.form.dirty || (this.initiales !== null && JSON.stringify(v) !== this.initiales);
  });

  ngOnInit(): void {
    const id = Number(this.id());
    this.bienService.getPrive(id).subscribe({
      next: bien => {
        this.bien.set(bien);
        this.form.patchValue({
          loyerMensuel: bien.loyerMensuel ?? null,
          chargesMensuelles: bien.chargesMensuelles ?? 0,
          depotGarantie: bien.depotGarantie ?? null,
          garantieMois: bien.garantieMois ?? null,
          avanceMois: bien.avanceMois ?? null,
        });
        this.initiales = JSON.stringify(this.form.getRawValue());
        this.juridictions.configuration(bien.pays).pipe(catchError(() => of(null))).subscribe(config => {
          this.appliquerGarantie(config ? !champVisible(config, 'depotGarantie') : bien.garantieMois != null);
        });
      },
      error: err => this.erreur.set(messageErreurApi(err, 'Ce bien est introuvable.')),
    });
  }

  private appliquerGarantie(enMois: boolean): void {
    this.garantieEnMois.set(enMois);
    const { depotGarantie, garantieMois, avanceMois } = this.form.controls;
    if (enMois) {
      depotGarantie.removeValidators(Validators.required);
      garantieMois.addValidators(Validators.required);
      avanceMois.addValidators(Validators.required);
    } else {
      depotGarantie.addValidators(Validators.required);
      garantieMois.removeValidators(Validators.required);
      avanceMois.removeValidators(Validators.required);
    }
    for (const c of [depotGarantie, garantieMois, avanceMois]) c.updateValueAndValidity();
  }

  choisirDuree(mois: number): void {
    this.form.controls.dureeBailMois.setValue(mois);
  }

  precedent(): void {
    this.erreur.set(null);
    this.etape.update(e => Math.max(0, e - 1));
  }

  suivant(): void {
    const champs = this.champsParEtape[this.etape()];
    champs.forEach(c => this.form.controls[c].markAsTouched());
    if (!this.etapeValide()) return;
    if (this.etape() < ETAPES.length - 1) {
      this.etape.update(e => e + 1);
      return;
    }
    this.creer();
  }

  quitter(): void {
    void this.router.navigate(['/biens', this.id(), 'bail']);
  }

  private creer(): void {
    const bien = this.bien();
    // Locataire actuel, ou candidat qui a réservé le bien (il deviendra locataire en signant)
    const locataire = locataireDuBail(bien);
    if (!bien || !locataire) {
      this.erreur.set('Choisissez d’abord le locataire de ce bien.');
      return;
    }
    const v = this.form.getRawValue();
    this.envoi.set(true);
    this.erreur.set(null);
    this.contratService.create({
      bienId: bien.id,
      emailLocataire: locataire.mail,
      dateDebut: v.dateDebut!,
      dureeBailMois: Number(v.dureeBailMois),
      loyerMensuel: Number(v.loyerMensuel),
      chargesMensuelles: Number(v.chargesMensuelles ?? 0),
      ...(this.garantieEnMois()
        ? { garantieMois: Number(v.garantieMois), avanceMois: Number(v.avanceMois) }
        : { depotGarantie: Number(v.depotGarantie) }),
    }).subscribe({
      next: () => {
        this.toasts.ok('Bail créé. Signez-le pour l’envoyer au locataire.');
        void this.router.navigate(['/biens', bien.id, 'bail'], { replaceUrl: true });
      },
      error: err => {
        this.envoi.set(false);
        this.erreur.set(messageErreurApi(err, 'Le bail n’a pas pu être créé.'));
      },
    });
  }
}
