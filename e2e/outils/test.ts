import { test as base, expect, type Page } from '@playwright/test';
import { API } from './global-setup';
import { Compte, fichierSession } from './comptes';
import { Journal } from './journal';
import { bloquerEcritures } from './simul';

interface Options {
  /** Compte connecté (état de session de connexion.setup.ts) ; `null` : visiteur. */
  compte: Compte | null;
}

interface Fixtures {
  /** Journal des appels de la page vers l'API locale. */
  journal: Journal;
  /** Écritures arrivées sur le garde-fou (aucune attendue : le test les intercepte lui-même). */
  ecrituresBloquees: string[];
}

/**
 * `test` des e2e Kupanga :
 * - `test.use({ compte: 'claire' })` : session de Claire, avec un jeton d'accès frais (le jeton vit 5 minutes ;
 *   le cookie de refresh enregistré à la connexion en donne un nouveau, sans passer par un 401) ;
 * - garde-fou : aucune écriture n'atteint l'API (voir `bloquerEcritures`), sauf celles qu'un test intercepte ;
 * - « marquer comme lu » (conversation, notification) est répondu par le test : la base de démo ne change pas ;
 * - le bouton Google (script externe) n'est pas chargé.
 */
export const test = base.extend<Options & Fixtures>({
  compte: [null, { option: true }],

  storageState: async ({ compte }, use) => {
    await use(compte ? fichierSession(compte) : { cookies: [], origins: [] });
  },

  context: async ({ context, compte }, use) => {
    if (compte) {
      const reponse = await context.request.post(`${API}/auth/refresh`, { headers: { Origin: 'http://localhost:4200' } });
      expect(reponse.ok(), `refresh de la session de ${compte} (relancer le projet « connexion »)`).toBeTruthy();
      const { accessToken } = (await reponse.json()) as { accessToken: string };
      await context.addInitScript(jeton => {
        // Le premier chargement reçoit le jeton frais ; ensuite l'application le gère elle-même
        if (!sessionStorage.getItem('e2e-jeton')) {
          localStorage.setItem('accessToken', jeton);
          sessionStorage.setItem('e2e-jeton', '1');
        }
      }, accessToken);
    }
    await context.route(/accounts\.google\.com|apis\.google\.com|youtube(-nocookie)?\.com|ytimg\.com/, r => r.abort());
    await use(context);
  },

  ecrituresBloquees: [
    async ({ page }, use) => {
      const bloquees = await bloquerEcritures(page);
      // Posé après le garde-fou, donc consulté avant lui
      await page.route(
        url => url.origin === API && /^\/messages\/conversation\/[^/]+\/lire$|^\/notifications\/(\d+\/lire|lire-toutes)$/.test(url.pathname),
        route => route.fulfill({ status: 200, contentType: 'application/json', body: '' }),
      );
      await use(bloquees);
      expect(bloquees, 'écritures non prévues vers l’API').toEqual([]);
    },
    { auto: true },
  ],

  journal: async ({ page }, use) => {
    await use(new Journal(page));
  },
});

export { expect };

/** Attend la fin du réseau et des polices (Figtree) : captures et relevés stables. */
export async function pagePrete(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Vrai sur le projet `telephone`. */
export function surTelephone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 768;
}
