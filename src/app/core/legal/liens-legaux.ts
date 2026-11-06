/**
 * Pages légales, publiées dans le dépôt public de l'API (`legal/`) en attendant un domaine.
 * Les mêmes adresses sont déclarées dans Google Auth Platform (Branding) : les changer aux deux endroits.
 */
const BASE = 'https://github.com/Kupanga-App/kupanga-Api/blob/main/legal';

export const LIENS_LEGAUX = {
  confidentialite: `${BASE}/confidentialite.md`,
  conditions: `${BASE}/conditions.md`,
} as const;
