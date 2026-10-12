import { adresseLisible, libellePays, libelleTypeBien, typeSansLogement, TYPES_BIEN } from './bien.model';

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
