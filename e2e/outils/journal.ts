import { createHash } from 'node:crypto';
import type { Page, Request } from '@playwright/test';
import { API } from './global-setup';

/** Un appel à l'API, réduit à ce qui doit rester identique d'une version du front à l'autre. */
export interface Appel {
  methode: string;
  /** Chemin normalisé : identifiants → `:id`, jetons de signature → `:token`, e-mails → `:email`. */
  chemin: string;
  /** Clés des paramètres d'URL, triées. */
  parametres: string[];
  /** Clés du corps JSON (premier niveau), triées ; `multipart` pour un formulaire de fichiers. */
  corps: string[] | 'multipart' | null;
  statut?: number;
  /** GET : empreinte du corps JSON de la réponse, sans les champs volatils (voir `stabiliser`). */
  reponse?: string;
}

/** Clé de comparaison : méthode et chemin normalisé. */
export const cle = (a: Pick<Appel, 'methode' | 'chemin'>): string => `${a.methode} ${a.chemin}`;

/** Le WebSocket de la messagerie (STOMP) et le renouvellement du jeton ne font pas partie des appels comparés. */
const IGNORES = [/^\/ws(\/|$)/, /^\/auth\/refresh$/];

export function normaliserChemin(pathname: string): string {
  return pathname
    .replace(/\/(signer)\/[^/]+$/, '/$1/:token')
    .split('/')
    .map(segment => {
      const s = decodeURIComponent(segment);
      if (/^\d+$/.test(s)) return ':id';
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return ':id';
      if (/^[^@\s]+@[^@\s]+$/.test(s)) return ':email';
      return segment;
    })
    .join('/');
}

function clesDuCorps(requete: Request): Appel['corps'] {
  const type = requete.headers()['content-type'] ?? '';
  if (type.includes('multipart/form-data')) return 'multipart';
  const brut = requete.postData();
  if (!brut) return null;
  try {
    const json = JSON.parse(brut);
    return json && typeof json === 'object' && !Array.isArray(json) ? Object.keys(json).sort() : [];
  } catch {
    return null;
  }
}

/**
 * Retire d'une réponse ce qui change à chaque appel sans que les données changent :
 * URL présignées (`urlPdf`, `urlRecu`, photos de profil : signature `X-Amz-*`), dates relatives à l'instant présent,
 * ordre des listes (l'API renvoie par exemple les lieux proches et les équipements dans un ordre variable ; l'ordre
 * des résultats d'une recherche suit le tri demandé, comparé avec le corps de la requête).
 */
export function stabiliser(valeur: unknown): unknown {
  if (Array.isArray(valeur)) {
    return valeur.map(stabiliser).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (valeur && typeof valeur === 'object') {
    const sortie: Record<string, unknown> = {};
    for (const k of Object.keys(valeur as object).sort()) {
      if (/^(urlPdf|urlRecu|lienSignature|expiresAt|serverTime|timestamp)$/.test(k)) continue;
      sortie[k] = stabiliser((valeur as Record<string, unknown>)[k]);
    }
    return sortie;
  }
  if (typeof valeur === 'string' && /X-Amz-(Signature|Credential|Date)/.test(valeur)) return '<url-presignee>';
  return valeur;
}

export function empreinte(valeur: unknown): string {
  return createHash('sha256').update(JSON.stringify(stabiliser(valeur))).digest('hex').slice(0, 16);
}

/**
 * Journal des appels d'une page vers l'API locale. Les réponses simulées par `page.route()` y figurent aussi
 * (la requête part bien du front) ; les GET réels reçoivent une empreinte de leur réponse.
 */
export class Journal {
  private readonly appels: Appel[] = [];
  private readonly enCours = new Set<Promise<void>>();

  constructor(page: Page) {
    page.on('request', requete => {
      const url = new URL(requete.url());
      if (url.origin !== API || IGNORES.some(r => r.test(url.pathname))) return;
      if (requete.method() === 'OPTIONS') return;
      const appel: Appel = {
        methode: requete.method(),
        chemin: normaliserChemin(url.pathname),
        parametres: [...new Set(url.searchParams.keys())].sort(),
        corps: clesDuCorps(requete),
      };
      this.appels.push(appel);
      const suivi = requete
        .response()
        .then(async reponse => {
          if (!reponse) return;
          appel.statut = reponse.status();
          if (appel.methode === 'GET' && reponse.ok() && (reponse.headers()['content-type'] ?? '').includes('json')) {
            appel.reponse = empreinte(await reponse.json());
          }
        })
        .catch(() => undefined)
        .finally(() => this.enCours.delete(suivi));
      this.enCours.add(suivi);
    });
  }

  /** Attend les réponses encore en route, puis rend la liste des appels dans l'ordre d'envoi. */
  async liste(): Promise<Appel[]> {
    await Promise.all([...this.enCours]);
    return [...this.appels];
  }

  /** Appels triés et dédoublonnés (méthode, chemin, paramètres, corps, statut, réponse). */
  async ensemble(): Promise<Appel[]> {
    const vus = new Map<string, Appel>();
    for (const a of await this.liste()) vus.set(JSON.stringify(a), a);
    return [...vus.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }

  vider(): void {
    this.appels.length = 0;
  }
}
