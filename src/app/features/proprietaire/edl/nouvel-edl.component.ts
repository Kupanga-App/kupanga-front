import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { BienService } from '../../biens/services/bien.service';
import { JuridictionService } from '../../biens/services/juridiction.service';
import { EdlService } from '../../gestion-logement/services/edl.service';
import { BienDTO } from '../../biens/models/bien.model';
import { EdlType, EtatElement, TypeCompteur, TypeElement } from '../../gestion-logement/models/edl.model';
import { COMPTEURS, ELEMENTS, ETATS } from '../../gestion-logement/models/edl-libelles';
import { messageErreurApi } from '../../../core/http/api-error';
import { ToastService } from '../../../core/ui/toast.service';
import { aujourdhuiIso } from '../../../shared/format';
import { AssistantComponent } from '../../../shared/ui/assistant.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** B8 : bornes de l'API (au-delà : 400). */
const MAX = { pieces: 50, elements: 50, compteurs: 10, cles: 20, quantiteCle: 50 } as const;

const ETAPES = ['Type et date', 'Compteurs', 'Clés', 'Pièces', 'Vérifiez et créez'];

const PIECES = ['Salon', 'Chambre', 'Cuisine', 'Salle de bain', 'WC', 'Entrée', 'Couloir', 'Balcon'];
const CLES = ['Porte d’entrée', 'Portail', 'Boîte aux lettres'];
/** Éléments ajoutés d'office à une nouvelle pièce. */
const ELEMENTS_PAR_DEFAUT: TypeElement[] = ['MUR', 'SOL', 'PLAFOND', 'PORTE'];

type ElementForm = FormGroup<{
  typeElement: FormControl<TypeElement>;
  etatElement: FormControl<EtatElement>;
  observation: FormControl<string>;
}>;
type PieceForm = FormGroup<{
  nomPiece: FormControl<string>;
  observations: FormControl<string>;
  elements: FormArray<ElementForm>;
}>;
type CompteurForm = FormGroup<{
  typeCompteur: FormControl<TypeCompteur>;
  numeroCompteur: FormControl<string>;
  index: FormControl<number | null>;
  unite: FormControl<string>;
}>;
type CleForm = FormGroup<{ typeCle: FormControl<string>; quantite: FormControl<number> }>;

/** État des lieux pas à pas : type et date, compteurs du pays (C13), clés, pièces et éléments, observations. */
@Component({
  selector: 'kp-nouvel-edl',
  standalone: true,
  imports: [ReactiveFormsModule, AssistantComponent, IconComponent],
  templateUrl: './nouvel-edl.component.html',
  styleUrl: './nouvel-edl.component.scss',
})
export class NouvelEdlComponent implements OnInit {
  readonly id = input.required<string>();

  private router = inject(Router);
  private bienService = inject(BienService);
  private juridictions = inject(JuridictionService);
  private edlService = inject(EdlService);
  private toasts = inject(ToastService);

  readonly etapes = ETAPES;
  readonly elementsPossibles = ELEMENTS;
  readonly etats = ETATS;
  readonly piecesProposees = PIECES;
  readonly max = MAX;
  readonly etape = signal(0);
  readonly bien = signal<BienDTO | null>(null);
  readonly erreur = signal<string | null>(null);
  readonly envoi = signal(false);
  /** Compteurs proposés dans le pays du bien (tous tant que la configuration n'est pas chargée). */
  readonly compteursDuPays = signal(COMPTEURS);

  readonly infos = new FormGroup({
    type: new FormControl<EdlType>('ENTREE', { nonNullable: true }),
    date: new FormControl(aujourdhuiIso(), { nonNullable: true, validators: [Validators.required] }),
    heure: new FormControl('', { nonNullable: true }),
    observations: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
  });
  readonly compteurs = new FormArray<CompteurForm>([]);
  readonly cles = new FormArray<CleForm>([]);
  readonly pieces = new FormArray<PieceForm>([]);

  private readonly changements = toSignal(this.pieces.valueChanges, { initialValue: null });
  private readonly changementsCompteurs = toSignal(this.compteurs.valueChanges, { initialValue: null });
  private readonly changementsCles = toSignal(this.cles.valueChanges, { initialValue: null });
  private readonly changementsInfos = toSignal(this.infos.valueChanges, { initialValue: null });

  readonly etapeValide = computed(() => {
    this.changements();
    this.changementsCompteurs();
    this.changementsCles();
    this.changementsInfos();
    switch (this.etape()) {
      case 0: return this.infos.controls.date.valid && this.infos.controls.heure.valid;
      case 1: return this.compteurs.valid;
      case 2: return this.cles.valid;
      case 3: return this.pieces.length > 0 && this.pieces.valid;
      default: return this.infos.valid;
    }
  });

  readonly nbElements = computed(() => {
    this.changements();
    return this.pieces.controls.reduce((n, p) => n + p.controls.elements.length, 0);
  });

  ngOnInit(): void {
    CLES.slice(0, 1).forEach(c => this.ajouterCle(c));
    this.bienService.getPrive(Number(this.id())).subscribe({
      next: bien => {
        this.bien.set(bien);
        if (!bien.locataire) {
          this.erreur.set('Choisissez d’abord le locataire de ce bien.');
        }
        this.juridictions.configuration(bien.pays).pipe(catchError(() => of(null))).subscribe(config => {
          const permis = config?.compteursEdl as TypeCompteur[] | undefined;
          if (permis?.length) {
            this.compteursDuPays.set(COMPTEURS.filter(c => permis.includes(c.valeur)));
          }
          // Compteurs du pays proposés d'office (index à relever sur place)
          this.compteursDuPays().slice(0, 3).forEach(c => this.ajouterCompteur(c.valeur));
        });
      },
      error: err => this.erreur.set(messageErreurApi(err, 'Ce bien est introuvable.')),
    });
  }

  // ── Compteurs ──────────────────────────────────────────────────────────────

  ajouterCompteur(type?: TypeCompteur): void {
    if (this.compteurs.length >= MAX.compteurs) return;
    const def = COMPTEURS.find(c => c.valeur === type) ?? this.compteursDuPays()[0];
    this.compteurs.push(new FormGroup({
      typeCompteur: new FormControl<TypeCompteur>(def.valeur, { nonNullable: true }),
      numeroCompteur: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
      index: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
      unite: new FormControl(def.unite, { nonNullable: true }),
    }));
  }

  changerTypeCompteur(i: number, type: TypeCompteur): void {
    const def = COMPTEURS.find(c => c.valeur === type);
    this.compteurs.at(i).patchValue({ typeCompteur: type, unite: def?.unite ?? '' });
  }

  // ── Clés ───────────────────────────────────────────────────────────────────

  ajouterCle(type = ''): void {
    if (this.cles.length >= MAX.cles) return;
    this.cles.push(new FormGroup({
      typeCle: new FormControl(type, { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
      quantite: new FormControl(1, { nonNullable: true, validators: [Validators.min(1), Validators.max(MAX.quantiteCle)] }),
    }));
  }

  changerQuantite(i: number, delta: number): void {
    const c = this.cles.at(i).controls.quantite;
    c.setValue(Math.min(MAX.quantiteCle, Math.max(1, c.value + delta)));
  }

  readonly clesProposees = CLES;

  // ── Pièces ─────────────────────────────────────────────────────────────────

  ajouterPiece(nom: string): void {
    if (this.pieces.length >= MAX.pieces) return;
    // « Chambre » deux fois → « Chambre 2 »
    const memes = this.pieces.controls.filter(p => p.controls.nomPiece.value.startsWith(nom)).length;
    const piece: PieceForm = new FormGroup({
      nomPiece: new FormControl(memes ? `${nom} ${memes + 1}` : nom, {
        nonNullable: true, validators: [Validators.required, Validators.maxLength(100)],
      }),
      observations: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
      elements: new FormArray<ElementForm>([]),
    });
    ELEMENTS_PAR_DEFAUT.forEach(t => piece.controls.elements.push(this.nouvelElement(t)));
    this.pieces.push(piece);
  }

  ajouterElement(piece: PieceForm): void {
    if (piece.controls.elements.length >= MAX.elements) return;
    piece.controls.elements.push(this.nouvelElement('EQUIPEMENT'));
  }

  private nouvelElement(type: TypeElement): ElementForm {
    return new FormGroup({
      typeElement: new FormControl<TypeElement>(type, { nonNullable: true }),
      etatElement: new FormControl<EtatElement>('BON', { nonNullable: true }),
      observation: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    });
  }

  libelleElement(type: TypeElement): string {
    return ELEMENTS.find(e => e.valeur === type)?.libelle ?? type;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  precedent(): void {
    this.etape.update(e => Math.max(0, e - 1));
  }

  suivant(): void {
    const forms = [this.infos, this.compteurs, this.cles, this.pieces, this.infos];
    forms[this.etape()].markAllAsTouched();
    if (!this.etapeValide()) return;
    if (this.etape() < ETAPES.length - 1) {
      this.etape.update(e => e + 1);
      return;
    }
    this.creer();
  }

  quitter(): void {
    void this.router.navigate(['/biens', this.id(), 'etats-des-lieux']);
  }

  private creer(): void {
    const bien = this.bien();
    if (!bien?.locataire) return;
    const v = this.infos.getRawValue();
    this.envoi.set(true);
    this.erreur.set(null);
    this.edlService.create({
      bienId: bien.id,
      emailLocataire: bien.locataire.mail,
      type: v.type,
      dateRealisation: v.date,
      heureRealisation: v.heure || undefined,
      observations: v.observations.trim() || undefined,
      compteurs: this.compteurs.getRawValue().map(c => ({
        typeCompteur: c.typeCompteur, numeroCompteur: c.numeroCompteur.trim(), index: Number(c.index), unite: c.unite,
      })),
      cles: this.cles.getRawValue().map(c => ({ typeCle: c.typeCle.trim(), quantite: c.quantite })),
      pieces: this.pieces.getRawValue().map((p, i) => ({
        nomPiece: p.nomPiece.trim(),
        ordre: i + 1,
        observations: p.observations.trim() || undefined,
        elements: p.elements.map(e => ({
          typeElement: e.typeElement, etatElement: e.etatElement, observation: e.observation.trim() || undefined,
        })),
      })),
    }).subscribe({
      next: () => {
        this.toasts.ok('État des lieux créé. Signez-le pour l’envoyer au locataire.');
        void this.router.navigate(['/biens', bien.id, 'etats-des-lieux'], { replaceUrl: true });
      },
      error: err => {
        this.envoi.set(false);
        this.erreur.set(messageErreurApi(err, 'L’état des lieux n’a pas pu être créé.'));
      },
    });
  }
}
