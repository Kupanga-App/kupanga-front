import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, input, output, signal,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import * as L from 'leaflet';

/** C2 : repère choisi par le propriétaire (clic sur la carte ou GPS du téléphone). */
export interface Repere {
  latitude: number;
  longitude: number;
}

/** Vue de départ quand aucun repère n'est placé, selon le pays du bien. */
const VUE_PAR_PAYS: Record<string, { centre: L.LatLngTuple; zoom: number }> = {
  FR: { centre: [46.6, 2.4], zoom: 5 },
  BE: { centre: [50.6, 4.6], zoom: 7 },
  CD: { centre: [-4.33, 15.31], zoom: 11 }, // Kinshasa (MVP)
  CG: { centre: [-4.27, 15.28], zoom: 11 }, // Brazzaville
};

/**
 * C2 : carte Leaflet + OpenStreetMap pour placer le repère d'un bien. Un clic place (ou déplace) le repère,
 * « Ma position » utilise le GPS du téléphone. Aucune clé d'API. Le repère est facultatif : sans lui, l'API
 * géocode l'adresse puis se replie sur le centre du quartier, de la commune ou de la ville.
 */
@Component({
  selector: 'kp-carte-repere',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="kp-carte">
      <div #carte class="kp-carte-map" role="application"
           aria-label="Carte : touchez pour placer le repère du logement"></div>
      <div class="kp-actions">
        <button class="kp-btn kp-btn--secondary kp-btn--sm" type="button" (click)="maPosition()" [disabled]="localisationEnCours()">
          <kp-icon name="locate-fixed" [size]="18" /> Ma position
        </button>
        @if (repere() && retirable()) {
          <button class="kp-btn kp-btn--ghost kp-btn--sm" type="button" (click)="retirer()">
            <kp-icon name="x" [size]="18" /> Retirer le repère
          </button>
        }
      </div>
      @if (erreur()) {
        <p class="kp-erreur">{{ erreur() }}</p>
      } @else if (!repere()) {
        <p class="kp-aide">Touchez la carte à l'emplacement exact du logement, ou utilisez votre position.</p>
      }
    </div>
  `,
  styles: [`
    .kp-carte { display: flex; flex-direction: column; gap: 8px; }
    .kp-carte-map { height: clamp(240px, 45dvh, 380px); width: 100%; border-radius: var(--kp-radius); overflow: hidden; z-index: 0; }
  `],
})
export class CarteRepereComponent implements AfterViewInit, OnDestroy {
  @ViewChild('carte', { static: true }) private conteneur!: ElementRef<HTMLDivElement>;

  /** Pays du bien : vue de départ. */
  readonly pays = input<string>('FR');
  /** Repère déjà connu (modification d'un bien). */
  readonly initial = input<Repere | null>(null);
  /** Faux en modification : l'API ne sait pas effacer une position (absence de repère = inchangée). */
  readonly retirable = input(true);
  readonly repereChange = output<Repere | null>();

  readonly repere = signal<Repere | null>(null);
  readonly localisationEnCours = signal(false);
  readonly erreur = signal<string | null>(null);

  private carte?: L.Map;
  private marqueur?: L.CircleMarker;

  ngAfterViewInit(): void {
    const vue = VUE_PAR_PAYS[this.pays()] ?? VUE_PAR_PAYS['FR'];
    this.carte = L.map(this.conteneur.nativeElement).setView(vue.centre, vue.zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.carte);
    this.carte.on('click', (e: L.LeafletMouseEvent) => this.placer(e.latlng.lat, e.latlng.lng));

    const initial = this.initial();
    if (initial) {
      this.placer(initial.latitude, initial.longitude, false);
      this.carte.setView([initial.latitude, initial.longitude], 16);
    }
    // La carte peut être créée dans une étape encore en cours d'affichage : recalcul de sa taille
    setTimeout(() => this.carte?.invalidateSize(), 0);
  }

  maPosition(): void {
    if (!('geolocation' in navigator)) {
      this.erreur.set('La localisation n\'est pas disponible sur cet appareil.');
      return;
    }
    this.localisationEnCours.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.localisationEnCours.set(false);
        this.placer(pos.coords.latitude, pos.coords.longitude);
        this.carte?.setView([pos.coords.latitude, pos.coords.longitude], 17);
      },
      () => {
        this.localisationEnCours.set(false);
        this.erreur.set('Position introuvable : autorisez la localisation ou cliquez sur la carte.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  retirer(): void {
    this.marqueur?.remove();
    this.marqueur = undefined;
    this.repere.set(null);
    this.repereChange.emit(null);
  }

  ngOnDestroy(): void {
    this.carte?.remove();
  }

  private placer(lat: number, lng: number, emettre = true): void {
    // Arrondi à 6 décimales (~10 cm) : bornes contrôlées par l'API
    const repere = { latitude: Math.round(lat * 1e6) / 1e6, longitude: Math.round(L.Util.wrapNum(lng, [-180, 180], true) * 1e6) / 1e6 };
    this.erreur.set(null);
    if (this.marqueur) {
      this.marqueur.setLatLng([repere.latitude, repere.longitude]);
    } else if (this.carte) {
      // Cercle plutôt que l'icône par défaut (images à copier dans les assets)
      this.marqueur = L.circleMarker([repere.latitude, repere.longitude], {
        radius: 10, color: '#10212B', weight: 3, fillColor: '#8FA464', fillOpacity: 0.9,
      }).addTo(this.carte);
    }
    this.repere.set(repere);
    if (emettre) this.repereChange.emit(repere);
  }
}
