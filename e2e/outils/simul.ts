import type { Page, Request, Route } from '@playwright/test';
import type { ContratDTO } from '../../src/app/features/gestion-logement/models/contrat.model';
import type { EtatDesLieuxDTO } from '../../src/app/features/gestion-logement/models/edl.model';
import type { DemandeLocation } from '../../src/app/features/biens/models/demande-location.model';
import type { Location } from '../../src/app/features/biens/models/location.model';
import type { UserDTO } from '../../src/app/features/biens/models/bien.model';
import { API } from './global-setup';

/**
 * Réponses simulées : états absents des données de démo (lien de signature valide, expiré, déjà signé ; demande
 * reçue ; logement réservé) et actions finales interceptées (rien n'atteint l'API, rien n'est écrit en base).
 * Les fabriques suivent les DTO du front (src/app/**\/models/*.ts).
 */

/** Dates relatives au jour du test, au format renvoyé par l'API (date locale sans fuseau). */
export function dansNJours(n: number, heure = '10:00:00'): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${heure}`;
}
export const jourJ = (n = 0) => dansNJours(n).slice(0, 10);

export function utilisateur(surcharge: Partial<UserDTO> = {}): UserDTO {
  return {
    id: 1,
    firstName: 'Claire',
    lastName: 'Martin',
    mail: 'claire.martin@kupanga.dev',
    role: 'ROLE_PROPRIETAIRE',
    hasCompleteProfil: true,
    ...surcharge,
  };
}

export function contrat(surcharge: Partial<ContratDTO> = {}): ContratDTO {
  return {
    id: 901,
    bienId: 2,
    adresseBien: '14 rue Vendôme, 69006 Lyon',
    proprietaire: utilisateur(),
    locataire: utilisateur({ id: 5, firstName: 'Inès', lastName: 'Moreau', mail: 'ines.moreau@kupanga.dev', role: 'ROLE_LOCATAIRE' }),
    loyerMensuel: 965,
    chargesMensuelles: 60,
    depotGarantie: 965,
    pays: 'FR',
    devise: 'EUR',
    dateDebut: jourJ(10),
    dureeBailMois: 12,
    proprietaireASigné: true,
    locataireASigné: false,
    dateSignatureProprietaire: dansNJours(-1),
    urlPdf: `${API}/simule/bail-901.pdf?X-Amz-Signature=1`,
    statut: 'EN_ATTENTE_SIGNATURE_LOCATAIRE',
    ...surcharge,
  };
}

export function etatDesLieux(surcharge: Partial<EtatDesLieuxDTO> = {}): EtatDesLieuxDTO {
  return {
    id: 902,
    type: 'ENTREE',
    statut: 'EN_ATTENTE_SIGNATURE_LOCATAIRE',
    dateRealisation: jourJ(-1),
    heureRealisation: '10:00',
    nomProprietaire: 'Claire Martin',
    emailProprietaire: 'claire.martin@kupanga.dev',
    nomLocataire: 'Inès Moreau',
    emailLocataire: 'ines.moreau@kupanga.dev',
    adresseBien: '14 rue Vendôme, 69006 Lyon',
    typeBien: 'APPARTEMENT',
    dateSignatureProprietaire: dansNJours(-1),
    urlPdf: `${API}/simule/edl-902.pdf?X-Amz-Signature=1`,
    compteurs: [{ typeCompteur: 'ELECTRICITE', numeroCompteur: 'A-1234', index: 1520, unite: 'kWh' }],
    cles: [{ typeCle: 'Porte d’entrée', quantite: 2 }],
    pieces: [
      {
        nomPiece: 'Séjour', ordre: 1,
        elements: [
          { typeElement: 'MUR', etatElement: 'BON' },
          { typeElement: 'SOL', etatElement: 'USAGE_NORMAL', observation: 'Rayures légères' },
        ],
      },
      { nomPiece: 'Cuisine', ordre: 2, elements: [{ typeElement: 'EQUIPEMENT', etatElement: 'BON', description: 'Plaques' }] },
    ],
    ...surcharge,
  };
}

export function demandeLocation(surcharge: Partial<DemandeLocation> = {}): DemandeLocation {
  return {
    id: 903,
    bienId: 2,
    titreBien: 'Appartement T3 avec parking, Brotteaux',
    adresseBien: 'Lyon',
    pays: 'FR',
    locataireId: 5,
    nomLocataire: 'Inès Moreau',
    nomProprietaire: 'Claire M.',
    statut: 'EN_ATTENTE',
    dateCreation: dansNJours(0, '09:00:00'),
    dateExpiration: dansNJours(3, '09:00:00'),
    dateReponse: null,
    ...surcharge,
  };
}

export function location(surcharge: Partial<Location> = {}): Location {
  return {
    id: 904,
    bienId: 2,
    titreBien: 'Appartement T3 avec parking, Brotteaux',
    adresseBien: 'Lyon',
    pays: 'FR',
    locataireId: 5,
    nomLocataire: 'Inès Moreau',
    nomProprietaire: 'Claire M.',
    statut: 'RESERVEE',
    dateReservation: dansNJours(-4),
    dateExpiration: dansNJours(10),
    dateDebut: null,
    dateFin: null,
    ...surcharge,
  };
}

// ── Interception ────────────────────────────────────────────────────────────────

/** Corps d'une requête en texte ; les transports `jsonp` de SockJS l'encodent en formulaire (`d=…`). */
export function corpsLisible(requete: Request): string {
  const brut = requete.postData() ?? '';
  if (!brut.startsWith('d=')) return brut;
  try {
    return decodeURIComponent(brut.slice(2).replace(/\+/g, ' '));
  } catch {
    return brut;
  }
}

/** Requête de SockJS qui transporte des trames du navigateur vers le serveur (`xhr_send`, `jsonp_send`). */
export const ENVOI_SOCKJS = /^\/ws\/[^/]+\/[^/]+\/\w+_send$/;

type Methode = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Adresse de l'API qui correspond exactement à `chemin` (paramètres d'URL ignorés). */
function filtre(chemin: string | RegExp) {
  return (url: URL) =>
    url.origin === API && (typeof chemin === 'string' ? url.pathname === chemin : chemin.test(url.pathname));
}

/** Répond à la place de l'API pour `methode chemin`, à chaque appel. Les autres requêtes passent. */
export async function simuler(
  page: Page,
  methode: Methode,
  chemin: string | RegExp,
  reponse: unknown | ((requete: Request) => unknown),
  statut = 200,
): Promise<void> {
  await page.route(filtre(chemin), async (route: Route) => {
    if (route.request().method() !== methode) return route.fallback();
    const corps = typeof reponse === 'function' ? (reponse as (r: Request) => unknown)(route.request()) : reponse;
    await route.fulfill({
      status: statut,
      contentType: 'application/json',
      body: corps === undefined ? '' : JSON.stringify(corps),
    });
  });
}

/** Erreur de l'API au format de `GlobalExceptionHandler` (message lu par `messageErreurApi`). */
export function erreurApi(statut: number, message: string) {
  return { status: statut, error: message, message, timestamp: new Date().toISOString() };
}

export interface RequeteInterceptee {
  methode: string;
  url: URL;
  corps: unknown;
  brut: string | null;
}

/**
 * Action finale interceptée : la requête ne part pas vers l'API. Rend une fonction qui attend la première requête
 * correspondante (méthode, adresse, corps lu en JSON) ; l'API simulée répond `reponse`.
 */
export async function intercepter(
  page: Page,
  methode: Methode,
  chemin: string | RegExp,
  reponse: unknown = undefined,
  statut = 200,
): Promise<{ requete: () => Promise<RequeteInterceptee>; nombre: () => number }> {
  const recues: RequeteInterceptee[] = [];
  let reveil: (() => void) | null = null;
  await page.route(filtre(chemin), async route => {
    const r = route.request();
    if (r.method() !== methode) return route.fallback();
    const brut = r.postData();
    let corps: unknown = brut;
    try {
      corps = brut ? JSON.parse(brut) : null;
    } catch {
      /* corps non JSON (multipart) */
    }
    recues.push({ methode: r.method(), url: new URL(r.url()), corps, brut });
    reveil?.();
    await route.fulfill({
      status: statut,
      contentType: 'application/json',
      body: reponse === undefined ? '' : JSON.stringify(reponse),
    });
  });
  return {
    nombre: () => recues.length,
    requete: async () => {
      if (!recues.length) await new Promise<void>(r => (reveil = r));
      return recues[0];
    },
  };
}

/** Garde-fou : toute écriture (POST, PUT, PATCH, DELETE) non prévue par le test échoue au lieu d'atteindre l'API. */
export async function bloquerEcritures(page: Page, permis: RegExp[] = []): Promise<string[]> {
  const bloquees: string[] = [];
  const LECTURES = [/\/search$/, /^\/auth\/(login|refresh)$/];
  await page.route(url => url.origin === API, async route => {
    const r = route.request();
    const chemin = new URL(r.url()).pathname;
    if (r.method() === 'GET' || r.method() === 'OPTIONS') return route.fallback();
    if ([...LECTURES, ...permis].some(p => p.test(chemin))) return route.fallback();
    // Transports de repli de SockJS : seul l'envoi d'un message est une écriture
    if (chemin.startsWith('/ws/') && !corpsLisible(r).includes('destination:/app/chat.send')) return route.fallback();
    bloquees.push(`${r.method()} ${chemin}`);
    await route.fulfill({ status: 418, contentType: 'application/json', body: JSON.stringify(erreurApi(418, 'Écriture bloquée par le test e2e')) });
  });
  return bloquees;
}

// ── Messagerie (STOMP sur SockJS, /ws) ─────────────────────────────────────────

export interface MessageIntercepte {
  destination: string;
  corps: { contenu: string; emailDestinataire?: string; bienId: number };
}

/** Lit une trame STOMP SEND dans un message SockJS (`["SEND\ndestination:…\n\n{…}\u0000"]`). */
function lireEnvoi(brut: string): MessageIntercepte | null {
  let trames: string[];
  try {
    trames = brut.startsWith('[') ? JSON.parse(brut) : [brut];
  } catch {
    return null;
  }
  const trame = trames.find(t => typeof t === 'string' && t.startsWith('SEND') && t.includes('destination:/app/chat.send'));
  if (!trame) return null;
  const [entete, ...reste] = trame.split('\n\n');
  const destination = /destination:([^\n]+)/.exec(entete)?.[1] ?? '';
  return { destination, corps: JSON.parse(reste.join('\n\n').replace(/\0$/, '')) };
}

/**
 * Messagerie temps réel relayée vers l'API (WebSocket SockJS, ou son repli XHR), sauf l'envoi d'un message
 * (`SEND /app/chat.send`) : retenu, il n'atteint pas l'API. `connecte()` attend la trame STOMP CONNECTED (WebSocket)
 * ou l'envoi de CONNECT (repli XHR) ; dans une conversation, le bandeau « Reconnexion… » disparaît à la connexion.
 */
export async function intercepterMessagerie(page: Page): Promise<{
  connecte: () => Promise<void>;
  envoi: () => Promise<MessageIntercepte>;
  nombreEnvois: () => number;
}> {
  const envois: MessageIntercepte[] = [];
  let reveilEnvoi: (() => void) | null = null;
  let estConnecte = false;
  let reveilConnexion: (() => void) | null = null;
  const garder = (brut: string): boolean => {
    const envoi = lireEnvoi(brut);
    if (!envoi) return false;
    envois.push(envoi);
    reveilEnvoi?.();
    return true;
  };
  const voirConnexion = (brut: string) => {
    if (!estConnecte && brut.includes('CONNECTED')) {
      estConnecte = true;
      reveilConnexion?.();
    }
  };

  await page.routeWebSocket(/:8089\/ws\//, ws => {
    const serveur = ws.connectToServer();
    ws.onMessage(m => {
      if (garder(typeof m === 'string' ? m : m.toString('utf8'))) return;
      serveur.send(m);
    });
    serveur.onMessage(m => {
      if (typeof m === 'string') voirConnexion(m);
      ws.send(m);
    });
  });
  // Repli de SockJS : l'envoi part dans un POST …/xhr_send ou …/jsonp_send (les flux ne se terminent jamais)
  await page.route(url => url.origin === API && ENVOI_SOCKJS.test(url.pathname), async route => {
    const corps = corpsLisible(route.request());
    if (garder(corps)) return route.fulfill({ status: 204, body: '' });
    const reponse = await route.fetch();
    if (corps.includes('CONNECT')) voirConnexion('CONNECTED');
    return route.fulfill({ response: reponse });
  });

  return {
    nombreEnvois: () => envois.length,
    connecte: async () => {
      if (!estConnecte) await new Promise<void>(r => (reveilConnexion = r));
    },
    envoi: async () => {
      if (!envois.length) await new Promise<void>(r => (reveilEnvoi = r));
      return envois[0];
    },
  };
}
