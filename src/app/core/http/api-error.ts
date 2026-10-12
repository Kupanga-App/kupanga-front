import { HttpErrorResponse } from '@angular/common/http';

/** Corps d'erreur renvoyé par l'API (ApiErrorResponse). */
interface ApiErrorBody {
  status?: number;
  message?: string;
  validationErrors?: Record<string, string>;
}

/**
 * Message lisible d'une erreur de l'API.
 * Le corps est un objet JSON, ou une chaîne JSON quand la requête attendait du texte (responseType: 'text').
 * - status 0 : réseau coupé, ou connexion fermée par le serveur (fichier trop gros, cf. B3) ;
 * - 400 avec validationErrors : premier message de champ ;
 * - sinon : message de l'API, à défaut le message par défaut fourni.
 */
export function messageErreurApi(err: unknown, parDefaut: string): string {
  if (!(err instanceof HttpErrorResponse)) {
    return parDefaut;
  }
  if (err.status === 0) {
    return 'Connexion impossible. Vérifiez votre réseau (ou la taille des fichiers envoyés) et réessayez.';
  }
  const corps = lireCorps(err.error);
  const champ = corps?.validationErrors ? Object.values(corps.validationErrors)[0] : undefined;
  if (champ) {
    return champ;
  }
  if (corps?.message) {
    return corps.message;
  }
  if (err.status === 429) {
    return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
  }
  if (err.status === 413) {
    return 'Fichier trop volumineux (10 Mo par fichier, 50 Mo au total).';
  }
  return parDefaut;
}

function lireCorps(error: unknown): ApiErrorBody | null {
  if (error && typeof error === 'object') {
    return error as ApiErrorBody;
  }
  if (typeof error === 'string') {
    try {
      const parse = JSON.parse(error);
      return parse && typeof parse === 'object' ? (parse as ApiErrorBody) : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * B7 : pages publiques de signature (lien reçu par e-mail).
 * 404 lien inconnu, 410 lien expiré, 409 document déjà signé ou figé (bien archivé, compte supprimé).
 */
export function messageLienSignature(err: unknown, parDefaut: string): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 404) {
      return "Lien de signature invalide. Ouvrez le dernier lien reçu par e-mail.";
    }
    if (err.status === 410) {
      return 'Ce lien de signature a expiré. Demandez au propriétaire de vous en renvoyer un.';
    }
  }
  return messageErreurApi(err, parDefaut);
}
