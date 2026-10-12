import { FormControl } from '@angular/forms';
import { normaliserTelephone, validateurTelephone } from './telephone';

describe('Téléphone (C6) : mêmes règles que l’API', () => {
  it('normalise au format international E.164', () => {
    expect(normaliserTelephone('+243 81 234-56.78')).toBe('+243812345678');
    expect(normaliserTelephone('00243812345678')).toBe('+243812345678');
    expect(normaliserTelephone('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(normaliserTelephone('+242 06 612 3456')).toBe('+242066123456'); // 0 gardé au Congo-Brazzaville
    expect(normaliserTelephone(' +32 (470) 12 34 56 ')).toBe('+32470123456');
  });

  it('refuse numéro local, 0 national après +33/+32/+243, lettres et longueurs hors bornes', () => {
    for (const saisie of ['0612345678', '+33 06 12 34 56 78', '+243 081 234 5678', '+32 0470 12 34 56',
      '+33 6 12 AB 56 78', '+1234', '+12345678901234567', '+0612345678']) {
      expect(normaliserTelephone(saisie)).withContext(saisie).toBeNull();
    }
  });

  it('validateur : vide accepté (facultatif), invalide signalé', () => {
    expect(validateurTelephone(new FormControl(''))).toBeNull();
    expect(validateurTelephone(new FormControl(null))).toBeNull();
    expect(validateurTelephone(new FormControl('+243812345678'))).toBeNull();
    expect(validateurTelephone(new FormControl('0812345678'))).toEqual({ telephone: true });
  });
});
