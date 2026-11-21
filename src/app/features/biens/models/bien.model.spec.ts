import { FormControl } from '@angular/forms';
import {
  adresseLisible, libellePays, libelleTypeBien, reglesGarantie, typeSansLogement, TYPES_BIEN, usageBail,
  validateurAvanceMois, validateurGarantieMois,
} from './bien.model';

describe('bien.model (J1, J4)', () => {
  it('nom du pays à afficher', () => {
    expect(libellePays('CD')).toBe('République démocratique du Congo');
    expect(libellePays('XX')).toBe('XX');
  });

  it('adresse lisible sans champ vide (miroir de Bien.adresseComplete côté API)', () => {
    expect(adresseLisible({ adresse: '12 rue des Tests', ville: 'Nantes', codePostal: '44000' }))
      .toBe('12 rue des Tests, 44000 Nantes');
    expect(adresseLisible({
      adresse: 'N° 12, Av. Kasa-Vubu', ville: 'Kinshasa', commune: 'Kalamu', quartier: 'Matonge', codePostal: undefined,
    })).toBe('N° 12, Av. Kasa-Vubu, quartier Matonge, commune de Kalamu, Kinshasa');
  });
});

describe('bien.model (C10)', () => {
  it('types de la RDC avec libellé ; parcelle et terrain sans logement', () => {
    expect(TYPES_BIEN.length).toBe(10);
    expect(libelleTypeBien('LOCAL_COMMERCIAL')).toBe('Local commercial');
    expect(libelleTypeBien('INCONNU')).toBe('INCONNU');
    expect(typeSansLogement('TERRAIN')).toBeTrue();
    expect(typeSansLogement('PARCELLE')).toBeTrue();
    expect(typeSansLogement('VILLA')).toBeFalse();
  });
});

describe('bien.model (loi n° 15/025, RDC)', () => {
  it('usage du bail : même règle que l’API', () => {
    expect(usageBail('VILLA')).toBe('HABITATION');
    expect(usageBail('PARCELLE')).toBe('HABITATION');
    expect(usageBail('LOCAL_COMMERCIAL')).toBe('PROFESSIONNEL');
    expect(usageBail('ENTREPOT')).toBe('PROFESSIONNEL');
    expect(usageBail('TERRAIN')).toBe('TERRAIN_NU');
  });

  it('logement en RDC : 3 mois de garantie au plus, aucune avance ; ailleurs 24 mois et avance permise', () => {
    expect(reglesGarantie('CD', 'CHAMBRE')).toEqual({ garantieMax: 3, avance: false });
    expect(reglesGarantie('CD', 'LOCAL_COMMERCIAL')).toEqual({ garantieMax: 24, avance: true });
    expect(reglesGarantie('FR', 'APPARTEMENT')).toEqual({ garantieMax: 24, avance: true });
  });

  it('validateurs : refusent 4 mois de garantie et toute avance pour un logement en RDC', () => {
    const regles = () => reglesGarantie('CD', 'VILLA');
    expect(validateurGarantieMois(regles)(new FormControl(3))).toBeNull();
    expect(validateurGarantieMois(regles)(new FormControl(4))).not.toBeNull();
    expect(validateurAvanceMois(regles)(new FormControl(0))).toBeNull();
    expect(validateurAvanceMois(regles)(new FormControl(1))).toEqual({ avanceInterdite: true });
    const pro = () => reglesGarantie('CD', 'ENTREPOT');
    expect(validateurGarantieMois(pro)(new FormControl(6))).toBeNull();
    expect(validateurAvanceMois(pro)(new FormControl(3))).toBeNull();
  });
});
