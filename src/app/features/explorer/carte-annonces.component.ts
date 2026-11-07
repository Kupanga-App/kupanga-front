import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, effect, inject, input, output, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { BienDTO } from '../biens/models/bien.model';
import { formatMontant } from '../../core/money/montant';

/**
 * Annonces sur une carte (Leaflet + OpenStreetMap, sans clé). La position publique est arrondie à ~100 m par l'API (C2).
 * Chaque annonce est une étiquette de prix (maquette `O1v2-Explorer`) ; l'annonce `selection` passe en nuit plein.
 * Toucher une étiquette la sélectionne et affiche le titre ; toucher la bulle ouvre l'annonce.
 * La carte suit la taille de son conteneur (bascule de vue, colonne collante) : `invalidateSize()` à chaque changement.
 */
@Component({
  selector: 'kp-carte-annonces',
  standalone: true,
  template: `
    <div #carte class="carte" role="region" aria-label="Carte des annonces"></div>
    <span class="mention">Position publique arrondie à 100 m</span>
  `,
  styles: [`
    :host { position: relative; display: block; border-radius: var(--kp-radius-lg); overflow: hidden; box-shadow: var(--kp-elev-0); }
    .carte { height: calc(100dvh - 260px - var(--kp-bottom-offset) - var(--kp-top-offset)); min-height: 320px; z-index: 0; background: var(--kp-surface-sunken); }
    :host(.remplir) { height: 100%; }
    :host(.remplir) .carte { height: 100%; min-height: 0; }
    .mention {
      position: absolute; left: 16px; bottom: 16px; z-index: 400; padding: 4px 12px; border-radius: var(--kp-radius-pill);
      background: var(--kp-surface); color: var(--kp-text-muted); font-size: var(--kp-fs-secondary); box-shadow: var(--kp-elev-0);
    }
    :host ::ng-deep .kp-prix-icone { background: none; border: 0; }
    :host ::ng-deep .kp-prix {
      display: inline-block; transform: translate(-50%, -50%); padding: 4px 8px; border-radius: 6px; white-space: nowrap;
      background: var(--kp-surface); color: var(--kp-text); box-shadow: var(--kp-elev-1);
      font: 500 13px/18px var(--kp-font); font-variant-numeric: tabular-nums; cursor: pointer;
      transition: background-color var(--kp-duree) var(--kp-ease), color var(--kp-duree) var(--kp-ease);
    }
    :host ::ng-deep .kp-prix.actif { background: var(--kp-text); color: var(--kp-text-on-accent); box-shadow: none; }
    :host ::ng-deep .leaflet-marker-icon:focus-visible { outline: none; }
    :host ::ng-deep .leaflet-marker-icon:focus-visible .kp-prix { box-shadow: var(--kp-focus); }
    :host ::ng-deep .kp-bulle { font-family: var(--kp-font); cursor: pointer; }
    :host ::ng-deep .kp-bulle strong { display: block; font-size: 15px; font-weight: 500; }
  `],
})
export class CarteAnnoncesComponent implements AfterViewInit, OnDestroy {
  readonly biens = input.required<BienDTO[]>();
  /** Annonce mise en avant (survolée dans la liste ou choisie sur la carte). */
  readonly selection = input<number | null>(null);
  readonly ouvrir = output<number>();
  /** Survol d'une étiquette (id), puis `null` en sortant. */
  readonly survol = output<number | null>();
  /** Étiquette touchée. */
  readonly choisir = output<number>();

  private readonly conteneur = viewChild.required<ElementRef<HTMLDivElement>>('carte');
  private readonly zone = inject(NgZone);
  private carte?: L.Map;
  private calque = L.layerGroup();
  private marqueurs = new Map<number, L.Marker>();
  private observateur?: ResizeObserver;

  constructor() {
    effect(() => this.afficher(this.biens()));
    effect(() => this.marquer(this.selection()));
  }

  ngAfterViewInit(): void {
    this.carte = L.map(this.conteneur().nativeElement).setView([-4.33, 15.31], 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.carte);
    this.calque.addTo(this.carte);
    this.afficher(this.biens());
    setTimeout(() => this.carte?.invalidateSize(), 0);
    if (typeof ResizeObserver === 'function') {
      this.observateur = new ResizeObserver(() => this.carte?.invalidateSize());
      this.observateur.observe(this.conteneur().nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.observateur?.disconnect();
    this.carte?.remove();
  }

  private icone(b: BienDTO, actif: boolean): L.DivIcon {
    // Prix seul, formaté par le front : aucun texte saisi par le propriétaire dans ce HTML
    const prix = formatMontant(b.loyerMensuel, b.devise, 0).replace(/[&<>"]/g, '');
    return L.divIcon({
      className: 'kp-prix-icone',
      html: `<span class="kp-prix${actif ? ' actif' : ''}">${prix}</span>`,
      iconSize: [0, 0],
    });
  }

  private afficher(biens: BienDTO[]): void {
    if (!this.carte) return;
    this.calque.clearLayers();
    this.marqueurs.clear();
    const points: L.LatLngTuple[] = [];
    const selection = this.selection();
    for (const b of biens) {
      if (b.latitude == null || b.longitude == null || b.precisionLocalisation === 'AUCUNE') continue;
      const point: L.LatLngTuple = [b.latitude, b.longitude];
      points.push(point);
      const marqueur = L.marker(point, {
        icon: this.icone(b, b.id === selection),
        keyboard: true,
        title: formatMontant(b.loyerMensuel, b.devise, 0) + ' par mois',
        zIndexOffset: b.id === selection ? 1000 : 0,
      });
      // Contenu construit en nœuds DOM (jamais de HTML avec le titre saisi par le propriétaire)
      const bulle = document.createElement('div');
      bulle.className = 'kp-bulle';
      const titre = document.createElement('strong');
      titre.textContent = formatMontant(b.loyerMensuel, b.devise, 0) + ' / mois';
      const texte = document.createElement('span');
      texte.textContent = b.titre;
      bulle.append(titre, texte);
      bulle.addEventListener('click', () => this.zone.run(() => this.ouvrir.emit(b.id)));
      marqueur.bindPopup(bulle, { offset: [0, -12] });
      marqueur.on('click', () => this.zone.run(() => this.choisir.emit(b.id)));
      marqueur.on('mouseover', () => this.zone.run(() => this.survol.emit(b.id)));
      marqueur.on('mouseout', () => this.zone.run(() => this.survol.emit(null)));
      marqueur.addTo(this.calque);
      this.marqueurs.set(b.id, marqueur);
    }
    if (points.length) {
      this.carte.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
    }
  }

  /** Met l'étiquette sélectionnée en nuit plein, au-dessus des autres. */
  private marquer(selection: number | null): void {
    for (const [id, marqueur] of this.marqueurs) {
      const el = marqueur.getElement()?.querySelector('.kp-prix');
      el?.classList.toggle('actif', id === selection);
      marqueur.setZIndexOffset(id === selection ? 1000 : 0);
    }
  }
}
