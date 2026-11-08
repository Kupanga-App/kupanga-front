import { DEMO } from '../outils/comptes';
import { expect, pagePrete, surTelephone, test } from '../outils/test';

/**
 * Garde de sortie de l'assistant d'état des lieux (décision du 7 novembre 2026) : sur téléphone, le retour du
 * système ne doit plus perdre la saisie sans confirmation.
 */
test.use({ compte: 'claire' });

test.describe('Assistant d’état des lieux : retour du navigateur', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!surTelephone(page), 'Geste retour du téléphone');
    // Historique réel : fiche → états des lieux → assistant
    await page.goto(`/biens/${DEMO.bienLoueClaire}`);
    await page.getByRole('navigation', { name: 'Sections du bien' }).getByRole('link', { name: 'États des lieux' }).click();
    await page.getByRole('link', { name: 'Nouvel état des lieux' }).click();
    await expect(page).toHaveURL(/\/etats-des-lieux\/nouveau$/);
    await pagePrete(page);
  });

  test('sans saisie : le retour quitte l’assistant sans question', async ({ page }) => {
    await page.goBack();
    await expect(page).toHaveURL(/\/biens\/\d+\/etats-des-lieux$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('après saisie : « Quitter sans enregistrer ? », « Continuer la saisie » garde la saisie', async ({ page }) => {
    await page.getByRole('radio', { name: 'Sortie du logement' }).click();
    await expect(page.getByRole('radio', { name: 'Sortie du logement' })).toBeChecked();

    await page.goBack();
    const fenetre = page.getByRole('dialog', { name: 'Quitter sans enregistrer ?' });
    await expect(fenetre).toBeVisible();
    await expect(fenetre).toContainText('Ce que vous avez saisi sera perdu');

    await fenetre.getByRole('button', { name: 'Continuer la saisie' }).click();
    await expect(fenetre).toBeHidden();
    await expect(page).toHaveURL(/\/etats-des-lieux\/nouveau$/);
    await expect(page.getByRole('radio', { name: 'Sortie du logement' })).toBeChecked();

    // Second retour, cette fois confirmé : on quitte l'assistant
    await page.goBack();
    await expect(fenetre).toBeVisible();
    await fenetre.getByRole('button', { name: 'Quitter', exact: true }).click();
    await expect(page).not.toHaveURL(/\/nouveau$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('« Quitter » de l’assistant confirmé : pas de seconde question', async ({ page }) => {
    await page.getByRole('radio', { name: 'Sortie du logement' }).click();
    await page.getByRole('button', { name: 'Quitter' }).click();
    await page.getByRole('dialog', { name: 'Quitter sans enregistrer ?' }).getByRole('button', { name: 'Quitter', exact: true }).click();
    await expect(page).toHaveURL(/\/biens\/\d+\/etats-des-lieux$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
