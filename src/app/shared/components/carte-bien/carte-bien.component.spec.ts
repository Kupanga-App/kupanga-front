import { TestBed } from '@angular/core/testing';
import { CarteBienComponent } from './carte-bien.component';
import { PrecisionLocalisation } from '../../../features/biens/models/bien.model';

describe('CarteBienComponent', () => {
  function creer(lat: number | null, lng: number | null, precision: PrecisionLocalisation | null, publique = false) {
    const fixture = TestBed.createComponent(CarteBienComponent);
    fixture.componentRef.setInput('latitude', lat);
    fixture.componentRef.setInput('longitude', lng);
    fixture.componentRef.setInput('precision', precision);
    fixture.componentRef.setInput('publique', publique);
    fixture.detectChanges();
    return fixture;
  }

  it('position exacte : un point et un lien d’itinéraire', () => {
    const fixture = creer(-4.3317, 15.3139, 'REPERE');
    const c = fixture.componentInstance;
    expect(c.rayon()).toBeNull();
    expect(c.lienItineraire()).toContain('destination=-4.3317,15.3139');
    expect(fixture.nativeElement.querySelector('.kp-carte-bien__map')).not.toBeNull();
  });

  it('annonce publique : une zone, pas d’itinéraire', () => {
    const c = creer(-4.332, 15.314, null, true).componentInstance;
    expect(c.rayon()).toBe(150);
    expect(c.lienItineraire()).toBeNull();
  });

  it('position approximative : zone à l’échelle de la commune', () => {
    expect(creer(-4.33, 15.31, 'COMMUNE').componentInstance.rayon()).toBe(2500);
  });

  it('sans position : rien n’est affiché', () => {
    expect(creer(null, null, 'AUCUNE').nativeElement.querySelector('.kp-carte-bien')).toBeNull();
    expect(creer(-4.33, 15.31, 'AUCUNE').nativeElement.querySelector('.kp-carte-bien')).toBeNull();
  });
});
