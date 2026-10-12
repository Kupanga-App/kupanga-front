import { MontantPipe, formatMontant, symboleDevise } from './montant';

/** Espaces (normales, insécables, fines) uniformisés pour comparer sans dépendre de la version d'ICU. */
const sansEspaces = (s: string) => s.replace(/[\s  ]/g, ' ');

describe('montant (J3)', () => {
  it('formate en euros à la française, avec centimes', () => {
    expect(sansEspaces(formatMontant(1234.5, 'EUR'))).toBe('1 234,50 €');
  });

  it('formate dans la devise du document, jamais en euros', () => {
    const usd = formatMontant(1200, 'USD');
    expect(sansEspaces(usd)).toContain('1 200,00');
    expect(usd).toContain('$');
    expect(usd).not.toContain('€');

    const cdf = formatMontant('250000', 'CDF');
    expect(sansEspaces(cdf)).toContain('250 000,00');
    expect(cdf).not.toContain('€');
  });

  it('suppose l’euro si la devise est absente (données antérieures à J3)', () => {
    expect(formatMontant(10, undefined)).toContain('€');
  });

  it('renvoie une chaîne vide pour un montant absent ou invalide', () => {
    expect(formatMontant(null, 'EUR')).toBe('');
    expect(formatMontant(undefined, 'EUR')).toBe('');
    expect(formatMontant('abc', 'EUR')).toBe('');
  });

  it('sans décimales sur demande', () => {
    expect(sansEspaces(new MontantPipe().transform(850, 'EUR', 0))).toBe('850 €');
  });

  it('donne le symbole seul de la devise', () => {
    expect(symboleDevise('EUR')).toBe('€');
    expect(symboleDevise('USD')).toContain('$');
    expect(symboleDevise('CDF')).not.toBe('€');
  });
});
