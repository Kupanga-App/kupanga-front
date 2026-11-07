import type { Page } from '@playwright/test';
import { DEMO } from '../outils/comptes';
import { expect, pagePrete, surTelephone, test } from '../outils/test';

/** Parcours P1 (visiteur) : landing, Explorer, annonces France et RDC, « Contacter » vers la connexion. */

const annonces = (page: Page) => page.getByRole('main').locator('a[href^="/annonces/"]');
const hrefs = async (page: Page) => annonces(page).evaluateAll(liens => liens.map(l => l.getAttribute('href')));
/** « 12 annonces, les moins chères d’abord » sous le titre. */
const nombreAnnonces = (page: Page) => page.getByRole('main').locator('h1 + p');

test.describe('Visiteur', () => {
  test('landing : RDC par défaut, bascule France, accès aux annonces', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Louez entre particuliers, de l’annonce au bail signé');

    const pays = page.getByRole('group', { name: 'Pays du bien' });
    await expect(pays.getByRole('button', { name: 'RDC' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('definition').filter({ hasText: 'Dollar US ou franc congolais' })).toBeVisible();
    await expect(page.getByRole('definition').filter({ hasText: 'Heures de courant par jour' })).toBeVisible();

    await pays.getByRole('button', { name: 'France' }).click();
    await expect(pays.getByRole('button', { name: 'France' })).toHaveAttribute('aria-pressed', 'true');
    await expect(pays.getByRole('button', { name: 'RDC' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('definition').filter({ hasText: 'Dollar US' })).toHaveCount(0);
    await expect(page.getByRole('term').filter({ hasText: 'Devise' })).toBeVisible();

    // « Annonces » (barre, ordinateur) ou « Voir les logements à louer » (téléphone) → Explorer
    if (surTelephone(page)) {
      await page.getByRole('link', { name: 'Voir les logements à louer' }).click();
    } else {
      await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Annonces' }).click();
    }
    await expect(page).toHaveURL(/\/explorer$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Logements à louer' })).toBeVisible();
  });

  test('Explorer : les filtres passent dans l’adresse et se rechargent à l’identique', async ({ page }) => {
    await page.goto('/explorer');
    await pagePrete(page);
    await expect(annonces(page).first()).toBeVisible();

    await page.getByRole('group', { name: 'Filtres' }).getByRole('button', { name: 'Filtres' }).click();
    const feuille = page.getByRole('dialog', { name: 'Filtres' });
    await feuille.getByLabel('Pays').selectOption('FR');
    await feuille.getByLabel('Ville').fill('Lyon');
    await feuille.getByRole('button', { name: 'Voir les annonces' }).click();
    await expect(page).toHaveURL(/[?&]pays=FR/);
    await expect(page).toHaveURL(/[?&]ville=Lyon/);

    await page.getByRole('group', { name: 'Filtres' }).getByRole('button', { name: 'Meublé' }).click();
    await expect(page).toHaveURL(/[?&]meuble=1/);
    await page.getByRole('combobox', { name: 'Trier' }).selectOption({ label: 'Loyer croissant' });
    await expect(page).toHaveURL(/[?&]tri=prix-croissant/);
    await pagePrete(page);

    const adresse = page.url();
    const avant = await hrefs(page);
    const compte = await nombreAnnonces(page).textContent();
    expect(compte).toMatch(/\d+ annonces?/);
    expect(avant.length).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Logements à louer à Lyon');

    await page.reload();
    await pagePrete(page);
    expect(page.url()).toBe(adresse);
    await expect(nombreAnnonces(page)).toHaveText(compte!);
    expect(await hrefs(page)).toEqual(avant);
    await expect(page.getByRole('combobox', { name: 'Trier' })).toHaveValue('prix-croissant');
    await expect(page.getByRole('group', { name: 'Filtres' }).getByRole('button', { name: 'Meublé' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('Explorer : les vues de la liste et de la carte', async ({ page }) => {
    await page.goto('/explorer');
    await pagePrete(page);
    const affichage = page.getByRole('group', { name: 'Affichage' });
    const carte = page.locator('.leaflet-container');

    if (surTelephone(page)) {
      await expect(affichage.getByRole('button')).toHaveText(['Liste', 'Carte']);
      await expect(affichage.getByRole('button', { name: 'Liste' })).toHaveAttribute('aria-pressed', 'true');
      await expect(carte).toHaveCount(0);
      await affichage.getByRole('button', { name: 'Carte' }).click();
      await expect(carte).toBeVisible();
      await affichage.getByRole('button', { name: 'Liste' }).click();
      await expect(annonces(page).first()).toBeVisible();
      return;
    }

    await expect(affichage.getByRole('button')).toHaveText(['Liste et carte', 'Liste', 'Carte']);
    await expect(affichage.getByRole('button', { name: 'Liste et carte' })).toHaveAttribute('aria-pressed', 'true');
    await expect(carte).toBeVisible();
    await expect(annonces(page).first()).toBeVisible();

    await affichage.getByRole('button', { name: 'Liste', exact: true }).click();
    await expect(carte).toHaveCount(0);
    await expect(annonces(page).first()).toBeVisible();

    await affichage.getByRole('button', { name: 'Carte', exact: true }).click();
    await expect(carte).toBeVisible();
    await expect.poll(() => page.locator('.leaflet-marker-icon').count()).toBeGreaterThan(0);
  });

  test('Explorer : une carte d’annonce ouvre l’annonce', async ({ page }) => {
    await page.goto('/explorer');
    await pagePrete(page);
    const premiere = annonces(page).first();
    const cible = await premiere.getAttribute('href');
    await premiere.click();
    await expect(page).toHaveURL(new RegExp(`${cible}$`));
    await expect(page.getByRole('link', { name: 'Retour aux annonces' })).toBeVisible();
  });

  test('annonce France : DPE et GES, dépôt de garantie', async ({ page }) => {
    await page.goto(`/annonces/${DEMO.bienVacantClaire}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Appartement T3 avec parking, Brotteaux');
    await expect(page.getByRole('term').filter({ hasText: 'Classe énergie (DPE)' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'DPE : classe A' }).first()).toBeVisible();
    await expect(page.getByRole('term').filter({ hasText: 'Émissions (GES)' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'GES : classe B' })).toBeVisible();
    await expect(page.getByRole('term').filter({ hasText: 'Dépôt de garantie' })).toBeVisible();
    await expect(page.getByRole('term').filter({ hasText: 'Courant' })).toHaveCount(0);
  });

  test('annonce RDC : courant, garantie en mois et loyers d’avance', async ({ page }) => {
    await page.goto(`/annonces/${DEMO.annonceRdc}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Villa 6 chambres à Haut-Commandement (Gombe)');
    await expect(page.getByRole('term').filter({ hasText: 'Courant' })).toBeVisible();
    await expect(page.getByRole('term').filter({ hasText: /^Garantie$/ })).toBeVisible();
    await expect(page.getByRole('term').filter({ hasText: 'Loyers d’avance' })).toBeVisible();
    await expect(page.getByText('Garantie 3 mois · 12 mois d’avance')).toBeVisible();
    await expect(page.getByRole('term').filter({ hasText: /DPE|GES/ })).toHaveCount(0);
  });

  test('« Contacter » mène à la connexion avec l’adresse de retour', async ({ page }) => {
    await page.goto(`/annonces/${DEMO.bienVacantClaire}`);
    await page.getByRole('button', { name: 'Contacter' }).first().click();
    await expect(page).toHaveURL(`/auth/login?returnUrl=${encodeURIComponent(`/messages?bienId=${DEMO.bienVacantClaire}`)}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Connexion' })).toBeVisible();
  });
});
