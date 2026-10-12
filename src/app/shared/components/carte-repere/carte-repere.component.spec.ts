import { TestBed } from '@angular/core/testing';
import { CarteRepereComponent, Repere } from './carte-repere.component';
import { positionApproximative } from '../../../features/biens/models/bien.model';

describe('CarteRepereComponent (C2)', () => {
  function creer(initial: Repere | null) {
    const fixture = TestBed.createComponent(CarteRepereComponent);
    fixture.componentRef.setInput('pays', 'CD');
    fixture.componentRef.setInput('initial', initial);
    fixture.detectChanges();
    return fixture;
  }

  it('affiche le repère initial sans l’émettre', () => {
    const fixture = creer({ latitude: -4.3317, longitude: 15.3139 });
    const emis: (Repere | null)[] = [];
    fixture.componentInstance.repereChange.subscribe(r => emis.push(r));

    expect(fixture.componentInstance.repere()).toEqual({ latitude: -4.3317, longitude: 15.3139 });
    expect(emis).toEqual([]);
  });

  it('« Retirer le repère » émet null', () => {
    const fixture = creer({ latitude: -4.3317, longitude: 15.3139 });
    const emis: (Repere | null)[] = [];
    fixture.componentInstance.repereChange.subscribe(r => emis.push(r));

    fixture.componentInstance.retirer();

    expect(fixture.componentInstance.repere()).toBeNull();
    expect(emis).toEqual([null]);
  });
});

describe('positionApproximative (C2)', () => {
  it('rien pour une position exacte, un message sinon', () => {
    expect(positionApproximative('REPERE')).toBeNull();
    expect(positionApproximative('ADRESSE')).toBeNull();
    expect(positionApproximative(undefined)).toBeNull();
    expect(positionApproximative('COMMUNE')).toContain('commune');
    expect(positionApproximative('AUCUNE')).toContain('carte');
  });
});
