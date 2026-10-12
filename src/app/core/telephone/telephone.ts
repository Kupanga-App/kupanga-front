import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * C6 : numéro de contact facultatif, non vérifié, au format international (E.164).
 * Mêmes règles que l'API (`TelephoneUtils`) : séparateurs (espace . - ( )) et préfixe « 00 » acceptés,
 * numéro local refusé, 0 national refusé après +33, +32 et +243 (il casserait les liens WhatsApp).
 */
const SAISIE = /^\+?[0-9 .()\-]{1,30}$/;
const SEPARATEURS = /[ .()\-]/g;
const E164 = /^\+[1-9][0-9]{7,14}$/;
const ZERO_NATIONAL = /^\+(33|32|243)0/;

/** @return le numéro E.164, `null` si la saisie est vide ou invalide */
export function normaliserTelephone(saisie: string | null | undefined): string | null {
  const brut = (saisie ?? '').trim();
  if (!brut || brut.length > 30 || !SAISIE.test(brut)) return null;
  let numero = brut.replace(SEPARATEURS, '');
  if (numero.startsWith('00')) numero = '+' + numero.slice(2);
  return E164.test(numero) && !ZERO_NATIONAL.test(numero) ? numero : null;
}

/** Validateur de formulaire : vide accepté (champ facultatif), sinon numéro international valide. */
export const validateurTelephone: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valeur = (control.value ?? '').toString().trim();
  return !valeur || normaliserTelephone(valeur) ? null : { telephone: true };
};

export const MESSAGE_TELEPHONE_INVALIDE =
  'Numéro au format international, ex. +243 81 234 56 78 ou +33 6 12 34 56 78.';

/** Lien d'appel (`tel:`) d'un numéro E.164 renvoyé par l'API. */
export function lienAppel(telephone: string): string {
  return `tel:${telephone}`;
}
