import { Pipe, PipeTransform } from '@angular/core';

/**
 * J3 : devise d'un bien, figée sur ses contrats et quittances (miroir de l'enum `Devise` de l'API).
 * Jamais de « € » en dur : tout montant s'affiche avec la devise du document ou du bien.
 */
export type Devise = 'EUR' | 'USD' | 'CDF' | 'XAF';

/** Devise supposée quand l'API n'en renvoie pas (données antérieures à J3 : toutes en euros). */
export const DEVISE_PAR_DEFAUT: Devise = 'EUR';

export const LIBELLES_DEVISE: Record<Devise, string> = {
  EUR: 'Euro (€)',
  USD: 'Dollar américain ($)',
  CDF: 'Franc congolais (FC)',
  XAF: 'Franc CFA (FCFA)',
};

const LOCALE = 'fr-FR';

function format(devise: Devise | null | undefined, decimales: number): Intl.NumberFormat {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: devise ?? DEVISE_PAR_DEFAUT,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/**
 * Montant formaté dans sa devise (« 1 234,50 € », « 1 200,00 $US », « 250 000,00 CDF »).
 * Montant absent ou non numérique → chaîne vide.
 */
export function formatMontant(
  montant: number | string | null | undefined,
  devise: Devise | null | undefined,
  decimales = 2,
): string {
  if (montant === null || montant === undefined || montant === '') {
    return '';
  }
  const valeur = typeof montant === 'number' ? montant : Number(montant);
  if (!Number.isFinite(valeur)) {
    return '';
  }
  // Espaces insécables fines du séparateur de milliers → espace insécable classique (polices sans U+202F)
  return format(devise, decimales).format(valeur).replace(/ /g, ' ');
}

/** Symbole seul de la devise (« € », « $US », « CDF »), pour les suffixes des champs de saisie. */
export function symboleDevise(devise: Devise | null | undefined): string {
  return format(devise, 0).formatToParts(0).find(p => p.type === 'currency')?.value ?? (devise ?? DEVISE_PAR_DEFAUT);
}

/** `{{ bien.loyerMensuel | montant: bien.devise }}` ; `{{ x | montant: devise : 0 }}` sans décimales. */
@Pipe({ name: 'montant', standalone: true })
export class MontantPipe implements PipeTransform {
  transform(montant: number | string | null | undefined, devise: Devise | null | undefined, decimales = 2): string {
    return formatMontant(montant, devise, decimales);
  }
}

/** `{{ bien.devise | symboleDevise }}` : symbole seul (suffixe d'un champ, unité d'un KPI). */
@Pipe({ name: 'symboleDevise', standalone: true })
export class SymboleDevisePipe implements PipeTransform {
  transform(devise: Devise | null | undefined): string {
    return symboleDevise(devise);
  }
}
