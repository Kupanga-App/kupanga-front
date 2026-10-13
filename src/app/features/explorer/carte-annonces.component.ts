import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, effect, inject, input, output, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { BienDTO } from '../biens/models/bien.model';
import { formatMontant } from '../../core/money/montant';

/**
 * Annonces sur une carte (Leaflet + OpenStreetMap, sans clé). La position publique est arrondie à ~100 m par l'API (C2).
 * Toucher un point affiche le titre et le loyer ; toucher la bulle ouvre l'annonce.
 */
@Component({
  selector: 'kp-carte-annonces',
  standalone: true,
  template: `<div #carte class="carte" role="region" aria-label="Carte des annonces"></div>`,
  styles: [`
    .carte { height: calc(100dvh - 260px - var(--kp-bottom-offset)); min-height: 320px; border-radius: var(--kp-radius); overflow: hidden; z-index: 0; }
    :host ::ng-deep .kp-bulle { font-family: var(--kp-font); cursor: pointer; }
    :host ::ng-deep .kp-bulle strong { display: block; font-size: 15px; }
  `],
})
export class CarteAnnoncesComponent implements AfterViewInit, OnDestroy {
  readonly biens = input.required<BienDTO[]>();
  readonly ouvrir = output<number>();

  private readonly conteneur = viewChild.required<ElementRef<HTMLDivElement>>('carte');
  private readonly zone = inject(NgZone);
  private carte?: L.Map;
  private calque = L.layerGroup();

  constructor() {
    effect(() => this.afficher(this.biens()));
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
  }

  ngOnDestroy(): void {
    this.carte?.remove();
  }

  private afficher(biens: BienDTO[]): void {
    if (!this.carte) return;
    this.calque.clearLayers();
    const points: L.LatLngTuple[] = [];
    for (const b of biens) {
      if (b.latitude == null || b.longitude == null || b.precisionLocalisation === 'AUCUNE') continue;
      const point: L.LatLngTuple = [b.latitude, b.longitude];
      points.push(point);
      const marqueur = L.circleMarker(point, {
        radius: 10, color: '#10212B', weight: 3, fillColor: '#8FA464', fillOpacity: 0.95,
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
      marqueur.bindPopup(bulle);
      marqueur.addTo(this.calque);
    }
    if (points.length) {
      this.carte.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
    }
  }
}
