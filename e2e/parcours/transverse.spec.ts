import { DEMO } from '../outils/comptes';
import { intercepter } from '../outils/simul';
import { expect, pagePrete, surTelephone, test } from '../outils/test';

/** Comportements communs : thème, clavier, fenêtres, toasts, hors ligne. */

test.describe('Claire', () => {
  test.use({ compte: 'claire' });

  test('thème sombre choisi dans Compte, appliqué et gardé après rechargement', async ({ page }) => {
    await page.goto('/compte');
    const racine = page.locator('html');
    await expect(racine).not.toHaveAttribute('data-theme', 'dark');
    const fondClair = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.getByRole('button', { name: /^Thème/ }).click();
    const fenetre = page.getByRole('dialog', { name: 'Thème' });
    await fenetre.getByRole('radio', { name: 'Sombre' }).click();
    await expect(racine).toHaveAttribute('data-theme', 'dark');
    await expect(fenetre).toBeHidden();
    await expect(page.getByRole('button', { name: /^Thème/ })).toContainText('Sombre');
    const fondSombre = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(fondSombre).not.toBe(fondClair);

    await page.reload();
    await expect(racine).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(fondSombre);
    await expect(page.getByRole('button', { name: /^Thème/ })).toContainText('Sombre');
  });

  test('navigation au clavier : lien d’évitement puis focus toujours visible', async ({ page }) => {
    test.skip(surTelephone(page), 'Clavier physique : ordinateur');
    await page.goto('/accueil');
    await pagePrete(page);

    await page.keyboard.press('Tab');
    const evitement = page.getByRole('link', { name: 'Aller au contenu' });
    await expect(evitement).toBeFocused();
    await expect(evitement).toBeInViewport();

    // Les éléments atteints au clavier portent un anneau de focus
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const anneau = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = getComputedStyle(el);
        return {
          visible: el.matches(':focus-visible'),
          marque: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0 || style.boxShadow !== 'none',
          nom: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40),
        };
      });
      expect(anneau.visible, `focus visible sur « ${anneau.nom} »`).toBe(true);
      expect(anneau.marque, `anneau de focus sur « ${anneau.nom} »`).toBe(true);
    }

    // Entrée sur le lien d'évitement : le focus passe au contenu
    await page.goto('/accueil');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#contenu$/);
  });

  test('toast après une action, fermable', async ({ page }) => {
    await intercepter(page, 'POST', '/contrats');
    await page.goto(`/biens/${DEMO.bienLoueClaire}/bail/nouveau`);
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Créer le bail' }).click();

    const toast = page.getByRole('status').filter({ hasText: 'Bail créé. Signez-le pour l’envoyer au locataire.' });
    await expect(toast).toBeVisible();
    await toast.getByRole('button', { name: 'Fermer le message' }).click();
    await expect(toast).toBeHidden();
  });
});

test.describe('Visiteur', () => {
  test('Échap ferme une fenêtre et rend le focus', async ({ page }) => {
    await page.goto('/explorer');
    await pagePrete(page);
    const declencheur = page.getByRole('group', { name: 'Filtres' }).getByRole('button', { name: 'Filtres' });
    await declencheur.click();
    const fenetre = page.getByRole('dialog', { name: 'Filtres' });
    await expect(fenetre).toBeVisible();
    // Focus piégé dans la fenêtre
    await expect.poll(() => fenetre.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(fenetre).toBeHidden();
    await expect(declencheur).toBeFocused();
  });
});

test.describe('Lucas', () => {
  test.use({ compte: 'lucas' });

  test('hors ligne sur Mon logement : bandeau, données gardées, retour en ligne', async ({ page, context }) => {
    await page.goto('/mon-logement');
    await pagePrete(page);
    const titre = page.getByRole('heading', { level: 1 });
    await expect(titre).toHaveText('Studio proche transports, Brotteaux');
    const bandeau = page.getByRole('status').filter({ hasText: 'Hors ligne : dernières données enregistrées sur cet appareil.' });
    await expect(bandeau).toHaveCount(0);

    await context.setOffline(true);
    await expect(bandeau).toBeVisible();
    await expect(titre).toHaveText('Studio proche transports, Brotteaux');
    await expect(page.getByRole('region', { name: 'Mon loyer' })).toContainText('365 €');
    await expect(page.getByRole('main')).toContainText(`propriétaire : Claire M.`);

    await context.setOffline(false);
    await expect(bandeau).toBeHidden();
  });
});
