import { AfterViewInit, Component, ElementRef, OnDestroy, computed, input, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { PrecisionLocalisation } from '../../../features/biens/models/bien.model';
import { IconComponent } from '../icon/icon.component';

/** Rayon de la zone affichée (m) quand la position n'est pas exacte. */
const RAYON_PAR_PRECISION: Partial<Record<PrecisionLocalisation, number>> = {
  QUARTIER: 800,
  COMMUNE: 2500,
  VILLE: 6000,
};
/** Annonce publique : position arrondie à ~100 m par l'API (C2), on montre une zone et non un point. */
const RAYON_PUBLIC = 150;

/**
 * Carte en lecture seule d'un bien (Leaflet + OpenStreetMap, sans clé). Position exacte (vue privée) → point ;
 * position approximative (centre du quartier, de la commune, de la ville) ou annonce publique (arrondie) → zone.
 * Rien n'est affiché sans position (`AUCUNE`).
 */
@Component({
  selector: 'kp-carte-bien',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (visible()) {
      <div class="kp-carte-bien">
        <div #carte class="kp-carte-bien__map" role="img" [attr.aria-label]="libelle()"></div>
        @if (lienItineraire(); as lien) {
          <a class="kp-btn kp-btn--secondary kp-btn--sm" [href]="lien" target="_blank" rel="noopener noreferrer">
            <kp-icon name="compass" [size]="18" /> Itinéraire
          </a>
        }
      </div>
    }
  `,
  styles: [`
    .kp-carte-bien { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .kp-carte-bien__map { height: clamp(200px, 35dvh, 300px); width: 100%; border-radius: var(--kp-radius); overflow: hidden; z-index: 0; }
  `],
})
export class CarteBienComponent implements AfterViewInit, OnDestroy {
  readonly latitude = input<number | null | undefined>();
  readonly longitude = input<number | null | undefined>();
  readonly precision = input<PrecisionLocalisation | null | undefined>();
  /** Vrai sur l'annonce publique : position arrondie, pas d'itinéraire. */
  readonly publique = input(false);

  private readonly conteneur = viewChild<ElementRef<HTMLDivElement>>('carte');
  private carte?: L.Map;

  readonly visible = computed(() =>
    this.latitude() != null && this.longitude() != null && this.precision() !== 'AUCUNE');

  /** Rayon de la zone en mètres, ou null pour un point exact. */
  readonly rayon = computed<number | null>(() => {
    const zone = RAYON_PAR_PRECISION[this.precision() as PrecisionLocalisation];
    if (zone) return zone;
    return this.publique() ? RAYON_PUBLIC : null;
  });

  readonly libelle = computed(() => this.rayon() == null
    ? 'Carte : emplacement du logement'
    : 'Carte : zone approximative du logement');

  /** Itinéraire seulement vers une position exacte (vue privée). */
  readonly lienItineraire = computed(() => {
    if (!this.visible() || this.rayon() != null) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${this.latitude()},${this.longitude()}`;
  });

  ngAfterViewInit(): void {
    const el = this.conteneur()?.nativeElement;
    if (!el || !this.visible()) return;
    const point: L.LatLngTuple = [this.latitude()!, this.longitude()!];
    // Sur téléphone, un doigt fait défiler la page au lieu de déplacer la carte
    this.carte = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile }).setView(point, 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.carte);

    const rayon = this.rayon();
    if (rayon == null) {
      L.circleMarker(point, { radius: 10, color: '#10212B', weight: 3, fillColor: '#8FA464', fillOpacity: 0.95 })
        .addTo(this.carte);
    } else {
      const zone = L.circle(point, { radius: rayon, color: '#10212B', weight: 2, fillColor: '#8FA464', fillOpacity: 0.25 })
        .addTo(this.carte);
      this.carte.fitBounds(zone.getBounds(), { padding: [16, 16] });
    }
    setTimeout(() => this.carte?.invalidateSize(), 0);
  }

  ngOnDestroy(): void {
    this.carte?.remove();
  }
}
