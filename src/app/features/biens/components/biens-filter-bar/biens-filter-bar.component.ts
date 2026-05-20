import { Component, Output, EventEmitter, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BienFilters } from '../../models/bien.model';

@Component({
  selector: 'kp-biens-filter-bar',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './biens-filter-bar.component.html',
  styleUrls: ['./biens-filter-bar.component.scss'],
})
export class BiensFilterBarComponent {
  @Output() filtersChange = new EventEmitter<BienFilters>();

  isAdvOpen = signal(false);

  readonly bienTypes: { value: string; label: string }[] = [
    { value: '',            label: 'Tous' },
    { value: 'APPARTEMENT', label: 'Appt.' },
    { value: 'STUDIO',      label: 'Studio' },
    { value: 'MAISON',      label: 'Maison' },
    { value: 'VILLA',       label: 'Villa' },
  ];

  readonly sortOptions: { value: string; label: string }[] = [
    { value: 'date_desc',    label: 'Date ↓' },
    { value: 'date_asc',     label: 'Date ↑' },
    { value: 'prix_asc',     label: 'Prix ↑' },
    { value: 'prix_desc',    label: 'Prix ↓' },
    { value: 'surface_desc', label: 'Surface ↓' },
  ];

  readonly dpeOptions = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

  readonly poiOptions: { key: string; label: string; cls: string; icon: string }[] = [
    { key: 'poiEcole',      label: 'École',      cls: 'poi-school',    icon: 'school' },
    { key: 'poiHopital',    label: 'Hôpital',    cls: 'poi-hospital',  icon: 'cross' },
    { key: 'poiPharmacie',  label: 'Pharmacie',  cls: 'poi-pharmacy',  icon: 'pill' },
    { key: 'poiTransports', label: 'Transports', cls: 'poi-transport', icon: 'bus' },
    { key: 'poiCommerces',  label: 'Commerces',  cls: 'poi-commerce',  icon: 'shopping-cart' },
    { key: 'poiGarderie',   label: 'Garderie',   cls: 'poi-nursery',   icon: 'baby' },
  ];

  readonly optionOptions: { key: string; label: string }[] = [
    { key: 'meuble',     label: 'Meublé' },
    { key: 'colocation', label: 'Colocation' },
    { key: 'ascenseur',  label: 'Ascenseur' },
  ];

  quickForm = new FormGroup({
    q:        new FormControl<string>(''),
    typeBien: new FormControl<string>(''),
    sortBy:   new FormControl<string>('date_desc'),
  });

  advForm = new FormGroup({
    ville:            new FormControl<string>(''),
    codePostal:       new FormControl<string>(''),
    loyerMax:         new FormControl<number | null>(null),
    surfaceMin:       new FormControl<number | null>(null),
    nbPiecesMin:      new FormControl<number | null>(null),
    nbChambresMin:    new FormControl<number | null>(null),
    classeEnergieMax: new FormControl<string>(''),
    poiEcole:         new FormControl<boolean>(false),
    poiHopital:       new FormControl<boolean>(false),
    poiPharmacie:     new FormControl<boolean>(false),
    poiTransports:    new FormControl<boolean>(false),
    poiCommerces:     new FormControl<boolean>(false),
    poiGarderie:      new FormControl<boolean>(false),
    meuble:           new FormControl<boolean>(false),
    colocation:       new FormControl<boolean>(false),
    ascenseur:        new FormControl<boolean>(false),
  });

  get sortLabel(): string {
    const v = this.quickForm.get('sortBy')?.value ?? 'date_desc';
    return this.sortOptions.find(o => o.value === v)?.label ?? 'Date ↓';
  }

  get selectedType(): string { return this.quickForm.get('typeBien')?.value ?? ''; }

  get sortByCtrl(): FormControl { return this.quickForm.get('sortBy') as FormControl; }

  get hasActiveFilters(): boolean {
    const q = this.quickForm.value;
    const a = this.advForm.value;
    return !!(q.q || q.typeBien ||
      a.ville || a.codePostal || a.loyerMax || a.surfaceMin ||
      a.nbPiecesMin || a.nbChambresMin || a.classeEnergieMax ||
      a.poiEcole || a.poiHopital || a.poiPharmacie || a.poiTransports ||
      a.poiCommerces || a.poiGarderie || a.meuble || a.colocation || a.ascenseur);
  }

  onTypeSelect(type: string): void {
    this.quickForm.get('typeBien')?.setValue(type);
    this.emitFilters();
  }

  onQuickChange(): void { this.emitFilters(); }

  toggleAdv(): void { this.isAdvOpen.update(v => !v); }

  applyAdv(): void {
    this.isAdvOpen.set(false);
    this.emitFilters();
  }

  resetAll(): void {
    this.quickForm.reset({ q: '', typeBien: '', sortBy: 'date_desc' });
    this.advForm.reset({
      ville: '', codePostal: '', loyerMax: null, surfaceMin: null,
      nbPiecesMin: null, nbChambresMin: null, classeEnergieMax: '',
      poiEcole: false, poiHopital: false, poiPharmacie: false,
      poiTransports: false, poiCommerces: false, poiGarderie: false,
      meuble: false, colocation: false, ascenseur: false,
    });
    this.emitFilters();
  }

  isPoiChecked(key: string): boolean {
    return !!(this.advForm.get(key)?.value);
  }

  isOptionChecked(key: string): boolean {
    return !!(this.advForm.get(key)?.value);
  }

  private emitFilters(): void {
    const q = this.quickForm.value;
    const a = this.advForm.value;

    const pois: string[] = [];
    if (a.poiEcole)      pois.push('École');
    if (a.poiHopital)    pois.push('Hôpital');
    if (a.poiPharmacie)  pois.push('Pharmacie');
    if (a.poiTransports) pois.push('Transports');
    if (a.poiCommerces)  pois.push('Commerces');
    if (a.poiGarderie)   pois.push("Garderie d'enfants");

    const filters: BienFilters = {
      ...(q.q            ? { q: q.q }            : {}),
      ...(q.typeBien     ? { typeBien: q.typeBien } : {}),
      sortBy: (q.sortBy ?? 'date_desc') as BienFilters['sortBy'],
      ...(a.ville        ? { ville: a.ville }        : {}),
      ...(a.codePostal   ? { codePostal: a.codePostal } : {}),
      ...(a.loyerMax     ? { loyerMax: a.loyerMax }   : {}),
      ...(a.surfaceMin   ? { surfaceMin: a.surfaceMin } : {}),
      ...(a.nbPiecesMin  ? { nbPiecesMin: a.nbPiecesMin } : {}),
      ...(a.nbChambresMin ? { nbChambresMin: a.nbChambresMin } : {}),
      ...(a.classeEnergieMax ? { classeEnergieMax: a.classeEnergieMax } : {}),
      ...(pois.length > 0 ? { pois } : {}),
      ...(a.meuble      ? { meuble: a.meuble }         : {}),
      ...(a.colocation  ? { colocation: a.colocation } : {}),
      ...(a.ascenseur   ? { ascenseur: a.ascenseur }   : {}),
    };

    this.filtersChange.emit(filters);
  }
}
