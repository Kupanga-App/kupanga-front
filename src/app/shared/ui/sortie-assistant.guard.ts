import { CanDeactivateFn } from '@angular/router';

/** Écran d'assistant qui peut retenir une sortie (saisie commencée, rien n'est enregistré avant la fin). */
export interface SortieProtegee {
  /** Vrai si l'écran peut être quitté ; sinon la promesse suit la réponse à « Quitter sans enregistrer ? ». */
  peutQuitter(): boolean | Promise<boolean>;
}

/**
 * Garde de sortie d'un assistant (décision du 7 novembre 2026) : le retour du navigateur ou le geste retour du
 * téléphone demande la même confirmation que « Quitter ». Ne change aucun droit d'accès.
 */
export const sortieAssistantGuard: CanDeactivateFn<SortieProtegee> = ecran => ecran?.peutQuitter() ?? true;
