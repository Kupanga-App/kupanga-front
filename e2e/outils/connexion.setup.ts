import fs from 'node:fs';
import { expect, request, test as setup } from '@playwright/test';
import { COMPTES, Compte, MOT_DE_PASSE, fichierSession } from './comptes';
import { API } from './global-setup';

/**
 * États de session par compte (cookie de refresh de l'API, utilisateur dans le localStorage), réutilisés par les
 * tests avec `storageState` ; la fixture `context` (test.ts) y ajoute un jeton d'accès frais.
 *
 * L'API limite la connexion à 20 essais par IP et par 15 minutes (`LimiteTentatives.LOGIN_PAR_IP`) : un état de
 * session encore valide (le cookie de refresh vit 14 jours, une nouvelle connexion du compte l'invalide) est donc
 * gardé. Le vrai parcours de connexion par l'écran /auth/login est joué à chaque exécution avec Inès, et pour
 * chaque compte dont l'état est absent ou périmé.
 */
const TOUJOURS_PAR_L_ECRAN: Compte = 'ines';

async function sessionValide(compte: Compte): Promise<boolean> {
  const fichier = fichierSession(compte);
  if (!fs.existsSync(fichier)) return false;
  const contexte = await request.newContext({ storageState: fichier });
  try {
    const reponse = await contexte.post(`${API}/auth/refresh`, { headers: { Origin: 'http://localhost:4200' } });
    return reponse.ok();
  } finally {
    await contexte.dispose();
  }
}

setup.describe.configure({ mode: 'serial' });

for (const compte of Object.keys(COMPTES) as Compte[]) {
  setup(`connexion de ${compte}`, async ({ page }) => {
    if (compte !== TOUJOURS_PAR_L_ECRAN && (await sessionValide(compte))) {
      setup.info().annotations.push({ type: 'session', description: 'état de session encore valide, réutilisé' });
      return;
    }

    await page.goto('/auth/login');
    await page.getByLabel('E-mail').fill(COMPTES[compte].email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE);
    const reponse = page.waitForResponse(r => r.url() === `${API}/auth/login`);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    const statut = (await reponse).status();
    const attente = (await reponse).headers()['retry-after'];
    expect(statut, `POST /auth/login${statut === 429 ? ` : quota de connexions atteint, réessayer dans ${attente} s` : ''}`).toBe(200);

    // Arrivée sur l'accueil du profil (propriétaire, candidat) ou sur Mon logement (locataire sans bien)
    await page.waitForURL(url => !url.pathname.startsWith('/auth'));
    await expect.poll(() => page.evaluate(() => localStorage.getItem('user'))).not.toBeNull();
    await page.context().storageState({ path: fichierSession(compte) });
  });
}
