import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { BienService } from '../biens/services/bien.service';
import { JuridictionService } from '../biens/services/juridiction.service';
import { AuthService } from '../../core/auth/services/auth.service';
import {
  BienDTO, BienSearchDTO, BienType, LIBELLES_POI, Pays, PoiType, TYPES_BIEN,
} from '../biens/models/bien.model';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SheetComponent } from '../../shared/ui/sheet.component';
import { SegmentedComponent, OptionSegment } from '../../shared/ui/segmented.component';
import { VideComponent } from '../../shared/ui/vide.component';
import { CarteBienComponent } from '../../shared/ui/carte-bien.component';
import { TirerPourActualiserDirective } from '../../shared/ui/tirer-pour-actualiser.directive';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CarteAnnoncesComponent } from './carte-annonces.component';

type Tri = 'recent' | 'prix-croissant' | 'prix-decroissant' | 'surface';
type Vue = 'liste' | 'carte';

/** Filtres de la recherche, gardés dans l'URL (retour depuis une annonce, lien partagé). */
interface Filtres {
  q: string;
  pays: Pays | '';
  ville: string;
  type: BienType | '';
  loyerMax: number | null;
  surfaceMin: number | null;
  piecesMin: number | null;
  meuble: boolean;
  colocation: boolean;
  pois: PoiType[];
  tri: Tri;
}

const VIDES: Filtres = {
  q: '', pays: '', ville: '', type: '', loyerMax: null, surfaceMin: null, piecesMin: null,
  meuble: false, colocation: false, pois: [], tri: 'recent',
};

const TRIS: { valeur: Tri; libelle: string }[] = [
  { valeur: 'recent', libelle: 'Plus récentes' },
  { valeur: 'prix-croissant', libelle: 'Loyer croissant' },
  { valeur: 'prix-decroissant', libelle: 'Loyer décroissant' },
  { valeur: 'surface', libelle: 'Plus grandes' },
];

const TAILLE_PAGE = 20;

/** Annonces publiques : accessibles sans compte (P0-6 : vue publique). */
@Component({
  selector: 'kp-explorer',
  standalone: true,
  imports: [
    PageHeaderComponent, SheetComponent, SegmentedComponent, VideComponent, CarteBienComponent,
    TirerPourActualiserDirective, IconComponent, CarteAnnoncesComponent,
  ],
  templateUrl: './explorer.component.html',
  styleUrl: './explorer.component.scss',
})
export class ExplorerComponent implements OnInit {
  private bienService = inject(BienService);
  private juridictions = inject(JuridictionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private auth = inject(AuthService);

  readonly biens = signal<BienDTO[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly derniere = signal(true);
  readonly chargement = signal(false);
  readonly erreur = signal(false);
  readonly filtres = signal<Filtres>({ ...VIDES });
  readonly vue = signal<Vue>('liste');
  readonly feuilleOuverte = signal(false);
  /** Copie modifiée dans la feuille, appliquée par « Voir les annonces ». */
  readonly brouillon = signal<Filtres>({ ...VIDES });

  readonly tris = TRIS;
  readonly typesBien = TYPES_BIEN;
  readonly pois = Object.entries(LIBELLES_POI) as [PoiType, string][];
  readonly vues: OptionSegment<Vue>[] = [
    { valeur: 'liste', libelle: 'Liste' },
    { valeur: 'carte', libelle: 'Carte' },
  ];
  readonly paysDisponibles = toSignal(this.juridictions.paysPrisEnCharge().pipe(catchError(() => of([]))), { initialValue: [] });

  readonly estProprietaire = computed(() => this.auth.currentUser()?.role === 'ROLE_PROPRIETAIRE');

  /** Nombre de filtres actifs (hors recherche par titre et tri), affiché sur le bouton. */
  readonly nbFiltres = computed(() => {
    const f = this.filtres();
    return [f.pays, f.ville, f.type, f.loyerMax, f.surfaceMin, f.piecesMin, f.meuble, f.colocation, f.pois.length]
      .filter(v => !!v).length;
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.filtres.set(lireFiltres(params));
      this.charger(0);
    });
  }

  rechercher(valeur: string): void {
    this.appliquer({ ...this.filtres(), q: valeur.trim() });
  }

  ouvrirFiltres(): void {
    this.brouillon.set({ ...this.filtres(), pois: [...this.filtres().pois] });
    this.feuilleOuverte.set(true);
  }

  modifier<K extends keyof Filtres>(cle: K, valeur: Filtres[K]): void {
    this.brouillon.update(f => ({ ...f, [cle]: valeur }));
  }

  nombre(valeur: string): number | null {
    const n = Number(valeur);
    return valeur.trim() && Number.isFinite(n) && n > 0 ? n : null;
  }

  basculerPoi(poi: PoiType): void {
    this.brouillon.update(f => ({
      ...f,
      pois: f.pois.includes(poi) ? f.pois.filter(p => p !== poi) : [...f.pois, poi],
    }));
  }

  validerFiltres(): void {
    this.feuilleOuverte.set(false);
    this.appliquer(this.brouillon());
  }

  effacerFiltres(): void {
    this.feuilleOuverte.set(false);
    this.appliquer({ ...VIDES, q: this.filtres().q });
  }

  toutEffacer(): void {
    this.appliquer({ ...VIDES });
  }

  changerTri(tri: Tri): void {
    this.appliquer({ ...this.filtres(), tri });
  }

  suite(): void {
    this.charger(this.page() + 1);
  }

  ouvrirAnnonce(id: number): void {
    void this.router.navigate(['/annonces', id]);
  }

  /** Les filtres passent par l'URL ; le chargement suit le changement de paramètres. */
  private appliquer(f: Filtres): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: ecrireFiltres(f), replaceUrl: true });
  }

  charger(page: number): void {
    const f = this.filtres();
    const dto: BienSearchDTO = { page, size: TAILLE_PAGE, ...triVersApi(f.tri) };
    if (f.q) dto.titre = f.q;
    if (f.pays) dto.pays = [f.pays];
    if (f.ville) dto.villes = [f.ville];
    if (f.type) dto.typesBien = [f.type];
    if (f.loyerMax) dto.loyerMax = f.loyerMax;
    if (f.surfaceMin) dto.surfaceMin = f.surfaceMin;
    if (f.piecesMin) dto.piecesMin = f.piecesMin;
    if (f.meuble) dto.meuble = true;
    if (f.colocation) dto.colocation = true;
    if (f.pois.length) dto.poisRequis = f.pois;

    this.chargement.set(true);
    this.erreur.set(false);
    this.bienService.search(dto).subscribe({
      next: resultat => {
        this.biens.set(page === 0 ? resultat.contenu : [...this.biens(), ...resultat.contenu]);
        this.total.set(resultat.totalElements);
        this.page.set(resultat.pageActuelle);
        this.derniere.set(resultat.dernierePage);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set(true);
      },
    });
  }
}

function triVersApi(tri: Tri): Pick<BienSearchDTO, 'sortBy' | 'sortDirection'> {
  switch (tri) {
    case 'prix-croissant': return { sortBy: 'loyerMensuel', sortDirection: 'ASC' };
    case 'prix-decroissant': return { sortBy: 'loyerMensuel', sortDirection: 'DESC' };
    case 'surface': return { sortBy: 'surfaceHabitable', sortDirection: 'DESC' };
    default: return { sortBy: 'createdAt', sortDirection: 'DESC' };
  }
}

function lireFiltres(p: ParamMap): Filtres {
  const nombre = (cle: string) => {
    const n = Number(p.get(cle));
    return p.get(cle) && Number.isFinite(n) && n > 0 ? n : null;
  };
  const types = TYPES_BIEN.map(t => t.value);
  const type = p.get('type') as BienType | null;
  const tri = p.get('tri') as Tri | null;
  return {
    q: (p.get('q') ?? '').slice(0, 100),
    pays: (['FR', 'BE', 'CD', 'CG'].includes(p.get('pays') ?? '') ? p.get('pays') : '') as Pays | '',
    ville: (p.get('ville') ?? '').slice(0, 100),
    type: type && types.includes(type) ? type : '',
    loyerMax: nombre('loyerMax'),
    surfaceMin: nombre('surfaceMin'),
    piecesMin: nombre('piecesMin'),
    meuble: p.get('meuble') === '1',
    colocation: p.get('colocation') === '1',
    pois: p.getAll('poi').filter((v): v is PoiType => v in LIBELLES_POI),
    tri: tri && TRIS.some(t => t.valeur === tri) ? tri : 'recent',
  };
}

function ecrireFiltres(f: Filtres): Record<string, string | string[] | null> {
  return {
    q: f.q || null,
    pays: f.pays || null,
    ville: f.ville.trim() || null,
    type: f.type || null,
    loyerMax: f.loyerMax ? String(f.loyerMax) : null,
    surfaceMin: f.surfaceMin ? String(f.surfaceMin) : null,
    piecesMin: f.piecesMin ? String(f.piecesMin) : null,
    meuble: f.meuble ? '1' : null,
    colocation: f.colocation ? '1' : null,
    poi: f.pois.length ? f.pois : null,
    tri: f.tri === 'recent' ? null : f.tri,
  };
}
