import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { BienService } from '../../biens/services/bien.service';
import { ContratService } from '../../gestion-logement/services/contrat.service';
import { QuittanceService } from '../../gestion-logement/services/quittance.service';
import { BienDTO } from '../../biens/models/bien.model';
import { ContratDTO } from '../../gestion-logement/models/contrat.model';
import { MontantPipe, symboleDevise } from '../../../core/money/montant';
import { messageErreurApi } from '../../../core/http/api-error';
import { ToastService } from '../../../core/ui/toast.service';
import { DateLonguePipe, de, moisAnnee } from '../../../shared/format';
import { AssistantComponent } from '../../../shared/ui/assistant.component';

const ETAPES = ['Mois et échéance', 'Vérifiez la quittance'];

/**
 * Nouvelle quittance : avec un bail signé, loyer et charges viennent du bail (J3 : devise figée) ;
 * sinon ils sont saisis. Le loyer reçu se déclare ensuite depuis la liste.
 */
@Component({
  selector: 'kp-nouvelle-quittance',
  standalone: true,
  imports: [ReactiveFormsModule, MontantPipe, DateLonguePipe, AssistantComponent],
  template: `
    <kp-assistant titre="Nouvelle quittance" [etapes]="etapes" [etape]="etape()" [peutContinuer]="etapeValide()"
                  [enCours]="envoi()" [erreur]="erreur()" libelleFin="Créer la quittance"
                  (precedent)="etape.set(0)" (suivant)="suivant()" (quitter)="quitter()">
      <form class="kp-form" [formGroup]="form" (ngSubmit)="suivant()">
        @if (etape() === 0) {
          <div class="kp-form-row">
            <div class="kp-field">
              <label class="kp-label" for="mois">Mois</label>
              <select id="mois" class="kp-input" formControlName="mois">
                @for (m of moisListe; track m.valeur) {
                  <option [ngValue]="m.valeur">{{ m.libelle }}</option>
                }
              </select>
            </div>
            <div class="kp-field">
              <label class="kp-label" for="annee">Année</label>
              <select id="annee" class="kp-input" formControlName="annee">
                @for (a of annees; track a) {
                  <option [ngValue]="a">{{ a }}</option>
                }
              </select>
            </div>
          </div>
          <div class="kp-field">
            <label class="kp-label" for="echeance">Date d’échéance</label>
            <input id="echeance" class="kp-input" type="date" formControlName="dateEcheance" />
            <span class="kp-aide">Date à laquelle le loyer doit être payé.</span>
          </div>
          @if (bail()) {
            <p class="kp-bandeau">Montants du bail signé : {{ bail()!.loyerMensuel | montant: bail()!.devise }} de loyer, {{ bail()!.chargesMensuelles | montant: bail()!.devise }} de charges.</p>
          } @else {
            <div class="kp-form-row">
              <div class="kp-field">
                <label class="kp-label" for="loyer">Loyer</label>
                <div class="kp-input-groupe">
                  <input id="loyer" class="kp-input" type="number" inputmode="decimal" min="0" step="0.01" formControlName="loyerMensuel" />
                  <span class="kp-suffixe">{{ symbole() }}</span>
                </div>
              </div>
              <div class="kp-field">
                <label class="kp-label" for="charges">Charges</label>
                <div class="kp-input-groupe">
                  <input id="charges" class="kp-input" type="number" inputmode="decimal" min="0" step="0.01" formControlName="chargesMensuelles" />
                  <span class="kp-suffixe">{{ symbole() }}</span>
                </div>
              </div>
            </div>
          }
        } @else {
          <dl class="kp-details">
            <div><dt>Locataire</dt><dd>{{ bien()?.locataire?.firstName }} {{ bien()?.locataire?.lastName }}</dd></div>
            <div><dt>Mois</dt><dd>{{ libelleMois() }}</dd></div>
            <div><dt>Échéance</dt><dd>{{ form.controls.dateEcheance.value | dateLongue }}</dd></div>
            <div><dt>Total</dt><dd>{{ total() | montant: devise() }}</dd></div>
          </dl>
          <p class="kp-aide">Le locataire verra la quittance « en attente ». Déclarez le loyer reçu quand il sera payé : la quittance signée sera alors disponible.</p>
        }
      </form>
    </kp-assistant>
  `,
})
export class NouvelleQuittanceComponent implements OnInit {
  readonly id = input.required<string>();

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private bienService = inject(BienService);
  private contratService = inject(ContratService);
  private quittanceService = inject(QuittanceService);
  private toasts = inject(ToastService);

  readonly etapes = ETAPES;
  readonly etape = signal(0);
  readonly bien = signal<BienDTO | null>(null);
  readonly bail = signal<ContratDTO | null>(null);
  readonly erreur = signal<string | null>(null);
  readonly envoi = signal(false);

  private readonly maintenant = new Date();
  readonly annees = [this.maintenant.getFullYear() + 1, this.maintenant.getFullYear(), this.maintenant.getFullYear() - 1];
  readonly moisListe = Array.from({ length: 12 }, (_, i) => ({ valeur: i + 1, libelle: moisAnnee(i + 1, null) }));

  readonly form = this.fb.group({
    mois: [this.maintenant.getMonth() + 1, Validators.required],
    annee: [this.maintenant.getFullYear(), Validators.required],
    dateEcheance: [this.echeanceParDefaut(), Validators.required],
    loyerMensuel: [null as number | null, [Validators.min(0.01)]],
    chargesMensuelles: [0 as number | null, [Validators.min(0)]],
  });

  private readonly valeurs = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly devise = computed(() => this.bail()?.devise ?? this.bien()?.devise);
  readonly symbole = computed(() => symboleDevise(this.devise()));
  readonly total = computed(() => {
    const v = this.valeurs();
    const b = this.bail();
    return b ? Number(b.loyerMensuel) + Number(b.chargesMensuelles) : (Number(v.loyerMensuel) || 0) + (Number(v.chargesMensuelles) || 0);
  });
  readonly libelleMois = computed(() => moisAnnee(this.valeurs().mois, this.valeurs().annee));
  readonly etapeValide = computed(() => {
    this.valeurs();
    return this.form.valid && !!this.bien()?.locataire && (!!this.bail() || !!this.form.controls.loyerMensuel.value);
  });

  ngOnInit(): void {
    const id = Number(this.id());
    forkJoin({
      bien: this.bienService.getPrive(id),
      contrats: this.contratService.getByBien(id).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ bien, contrats }) => {
        this.bien.set(bien);
        this.bail.set(contrats.find(c => c.statut === 'SIGNE') ?? null);
        this.form.patchValue({ loyerMensuel: bien.loyerMensuel ?? null, chargesMensuelles: bien.chargesMensuelles ?? 0 });
        if (!bien.locataire) this.erreur.set('Choisissez d’abord le locataire de ce bien.');
      },
      error: err => this.erreur.set(messageErreurApi(err, 'Ce bien est introuvable.')),
    });
  }

  suivant(): void {
    this.form.markAllAsTouched();
    if (!this.etapeValide()) return;
    if (this.etape() === 0) {
      this.etape.set(1);
      return;
    }
    this.creer();
  }

  quitter(): void {
    void this.router.navigate(['/biens', this.id(), 'quittances']);
  }

  private creer(): void {
    const bien = this.bien();
    if (!bien?.locataire) return;
    const v = this.form.getRawValue();
    const bail = this.bail();
    this.envoi.set(true);
    this.erreur.set(null);
    this.quittanceService.create({
      bienId: bien.id,
      emailLocataire: bien.locataire.mail,
      contratId: bail?.id,
      mois: Number(v.mois),
      annee: Number(v.annee),
      dateEcheance: v.dateEcheance!,
      loyerMensuel: bail ? undefined : Number(v.loyerMensuel),
      chargesMensuelles: bail ? undefined : Number(v.chargesMensuelles ?? 0),
    }).subscribe({
      next: () => {
        this.toasts.ok(`Quittance ${de(this.libelleMois())} créée.`);
        void this.router.navigate(['/biens', bien.id, 'quittances'], { replaceUrl: true });
      },
      error: err => {
        this.envoi.set(false);
        this.erreur.set(messageErreurApi(err, 'La quittance n’a pas pu être créée.'));
      },
    });
  }

  /** Le 5 du mois suivant par défaut. */
  private echeanceParDefaut(): string {
    const d = new Date(this.maintenant.getFullYear(), this.maintenant.getMonth(), 5);
    if (d < this.maintenant) d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
