import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { BienService } from '../../biens/services/bien.service';
import { JuridictionService } from '../../biens/services/juridiction.service';
import { ContratService } from '../../gestion-logement/services/contrat.service';
import { BienDTO } from '../../biens/models/bien.model';
import { champVisible } from '../../biens/models/juridiction.model';
import { MontantPipe, symboleDevise } from '../../../core/money/montant';
import { messageErreurApi } from '../../../core/http/api-error';
import { ToastService } from '../../../core/ui/toast.service';
import { DateLonguePipe, aujourdhuiIso } from '../../../shared/format';
import { AssistantComponent } from '../../../shared/ui/assistant.component';

const ETAPES = ['Début et durée du bail', 'Loyer et garantie', 'Vérifiez le bail'];
const DUREES = [12, 24, 36];

/** Création d'un bail en 3 étapes ; la juridiction du bien dit si la garantie est en montant ou en mois (C12). */
@Component({
  selector: 'kp-nouveau-bail',
  standalone: true,
  imports: [ReactiveFormsModule, MontantPipe, DateLonguePipe, AssistantComponent],
  templateUrl: './nouveau-bail.component.html',
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

  private readonly valeurs = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly devise = computed(() => this.bien()?.devise);
  readonly symbole = computed(() => symboleDevise(this.devise()));
  readonly nomLocataire = computed(() => {
    const l = this.bien()?.locataire;
    return l ? `${l.firstName} ${l.lastName}` : '';
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
    if (!bien?.locataire) {
      this.erreur.set('Choisissez d’abord le locataire de ce bien.');
      return;
    }
    const v = this.form.getRawValue();
    this.envoi.set(true);
    this.erreur.set(null);
    this.contratService.create({
      bienId: bien.id,
      emailLocataire: bien.locataire.mail,
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
