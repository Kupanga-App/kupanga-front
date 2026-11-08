import { expect, surTelephone, test } from '../outils/test';
import { ECRANS_ORDINATEUR, ECRANS_TELEPHONE, afficher, masques, type Ecran } from './ecrans';

/**
 * Non-régression visuelle (bloquant) : `toHaveScreenshot()` des écrans principaux, sur ordinateur et téléphone, en
 * clair, et en sombre pour l'accueil propriétaire, Mon logement et la signature. L'instantané de référence est le
 * rendu actuel validé (e2e/visuel/instantanes/<projet>/) : il protège la refonte des régressions futures.
 * Après un changement voulu de l'interface : `npx playwright test e2e/visuel/instantanes.spec.ts --update-snapshots`.
 */

const SOMBRE = ['Nav-Proprio-Tableau', 'Mon-Logement', 'Signer-Bail'];

function capturer(ecran: Ecran, theme: 'clair' | 'sombre') {
  test.describe(`${ecran.nom} (${theme})`, () => {
    test.use({ compte: ecran.compte, colorScheme: theme === 'sombre' ? 'dark' : 'light' });

    test(`${ecran.nom} ${theme}`, async ({ page }) => {
      const telephone = surTelephone(page);
      test.skip(!!ecran.telephone && !telephone, 'Écran propre au téléphone');
      if (!telephone) await page.setViewportSize({ width: 1440, height: Math.min(ecran.hauteur ?? 900, 2000) });
      await afficher(page, ecran);
      await expect(page).toHaveScreenshot(`${ecran.nom}${theme === 'sombre' ? '-sombre' : ''}.png`, {
        mask: masques(page, ecran),
      });
    });
  });
}

for (const ecran of [...ECRANS_ORDINATEUR, ...ECRANS_TELEPHONE]) capturer(ecran, 'clair');
for (const ecran of ECRANS_ORDINATEUR.filter(e => SOMBRE.includes(e.nom))) capturer(ecran, 'sombre');
