import type { Page } from '@playwright/test';
import { API } from '../outils/global-setup';
import { COMPTES, DEMO } from '../outils/comptes';
import { intercepter, intercepterMessagerie } from '../outils/simul';
import { expect, pagePrete, surTelephone, test } from '../outils/test';

/**
 * Parcours P2 à P5 (propriétaire) avec Claire (France) puis Patrick (RDC). Les créations (bail, état des lieux)
 * et l'envoi d'un message sont interceptés : le test vérifie la requête, rien n'atteint l'API.
 */

const navigation = (page: Page) => page.getByRole('navigation', { name: 'Navigation principale' });
const sections = (page: Page) => page.getByRole('navigation', { name: 'Sections du bien' });

test.describe('Propriétaire (Claire, France)', () => {
  test.use({ compte: 'claire' });

  test('navigation : barre latérale sur ordinateur, onglets du bas sur téléphone', async ({ page }) => {
    await page.goto('/accueil');
    const nav = navigation(page);
    if (surTelephone(page)) {
      await expect(nav.getByRole('link')).toHaveText(['Accueil', 'Mes biens', 'Messages', 'Documents', 'Compte']);
    } else {
      await expect(nav.getByRole('link', { name: 'Accueil' })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Mes biens 6 biens' })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Messages' })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Documents' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Voir les annonces' })).toHaveAttribute('href', '/explorer');
      await expect(page.getByRole('link', { name: COMPTES.claire.nom })).toHaveAttribute('href', '/compte');
      await expect(page.getByRole('link', { name: /^Notifications/ })).toBeVisible();
      // La barre reste en place d'un écran à l'autre
      await nav.getByRole('link', { name: /^Mes biens/ }).click();
      await expect(page).toHaveURL(/\/biens$/);
      await expect(nav).toBeVisible();
    }
  });

  test('accueil : chiffres cohérents avec les données (6 biens, 1 loué) et filtres', async ({ page }) => {
    await page.goto('/accueil');
    // Mêmes données que l'écran : GET /users/biens avec le jeton de la session
    const jeton = await page.evaluate(() => localStorage.getItem('accessToken'));
    const reponse = await page.request.get(`${API}/users/biens`, { headers: { Authorization: `Bearer ${jeton}` } });
    const donnees = (await reponse.json()) as { locataire?: unknown; archive?: boolean }[];
    const actifs = donnees.filter(b => !b.archive);
    const loues = actifs.filter(b => b.locataire).length;
    expect(actifs.length).toBe(6);
    expect(loues).toBe(1);

    const main = page.getByRole('main');
    await expect(main.getByText(`${COMPTES.claire.nom} · 6 biens`)).toBeVisible();
    const chiffres = page.getByRole('region', { name: 'Chiffres du mois' });
    await expect(chiffres).toContainText(/Biens loués\s*1 sur 6/);
    await expect(chiffres).toContainText(`${Math.round((loues / actifs.length) * 100)} % d’occupation`);
    await expect(chiffres).toContainText(/Loyer attendu en \p{L}+ 365\s€/u);

    const filtres = page.getByRole('group', { name: 'Filtrer les biens' });
    const lignes = page.getByRole('region', { name: 'Mes biens' }).getByRole('listitem');
    await expect(filtres.getByRole('button')).toHaveText([/Tous\s*6/, /Loués\s*1/, /Vacants\s*5/]);
    await expect(lignes).toHaveCount(6);
    await filtres.getByRole('button', { name: /Loués/ }).click();
    await expect(lignes).toHaveCount(1);
    await expect(lignes.first()).toContainText('Studio proche transports, Brotteaux');
    await expect(lignes.first()).toContainText('Lucas Bernard');
    await filtres.getByRole('button', { name: /Vacants/ }).click();
    await expect(lignes).toHaveCount(5);
    await expect(lignes.filter({ hasText: 'Lucas Bernard' })).toHaveCount(0);
    await filtres.getByRole('button', { name: /Tous/ }).click();
    await expect(lignes).toHaveCount(6);
  });

  test('fiche du bien loué et ses quatre onglets', async ({ page }) => {
    await page.goto('/accueil');
    await page.getByRole('region', { name: 'Mes biens' }).getByRole('link', { name: /Studio proche transports, Brotteaux/ }).click();
    await expect(page).toHaveURL(`/biens/${DEMO.bienLoueClaire}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Studio proche transports, Brotteaux');
    await expect(page.getByRole('main')).toContainText('325 € + 40 € de charges');
    await expect(page.getByRole('region', { name: 'Locataire' })).toContainText('Lucas Bernard');
    await expect(page.getByRole('list', { name: 'Où en est la location' }).getByRole('listitem')).toHaveCount(4);

    await sections(page).getByRole('link', { name: 'Bail' }).click();
    await expect(page).toHaveURL(`/biens/${DEMO.bienLoueClaire}/bail`);
    await expect(page.getByText('Bail signé par les deux parties')).toBeVisible();
    const conditions = page.getByRole('region', { name: 'Conditions' });
    await expect(conditions.getByRole('definition').first()).toHaveText('Lucas Bernard');

    await sections(page).getByRole('link', { name: 'États des lieux' }).click();
    await expect(page).toHaveURL(`/biens/${DEMO.bienLoueClaire}/etats-des-lieux`);
    await expect(page.getByRole('region', { name: 'États des lieux du bien' })).toContainText('État des lieux d’entrée');

    await sections(page).getByRole('link', { name: 'Quittances' }).click();
    await expect(page).toHaveURL(`/biens/${DEMO.bienLoueClaire}/quittances`);
    await expect(page.getByRole('table', { name: 'Quittances du bien' })).toBeVisible();

    await sections(page).getByRole('link', { name: 'Vue d’ensemble' }).click();
    await expect(page).toHaveURL(`/biens/${DEMO.bienLoueClaire}`);
  });

  test('bail : assistant jusqu’à la vérification, « Continuer » dit ce qui manque, « Quitter » demande confirmation', async ({ page }) => {
    await page.goto(`/biens/${DEMO.bienLoueClaire}/bail/nouveau`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Début et durée du bail');
    await page.getByRole('button', { name: 'Continuer' }).click();

    const loyer = page.getByLabel('Loyer hors charges');
    await expect(loyer).toHaveValue('325');
    await loyer.fill('');
    await expect(page.getByRole('button', { name: 'Continuer' })).toBeDisabled();
    await expect(page.getByText('Indiquez le loyer hors charges.').first()).toBeVisible();
    await loyer.fill('325');
    await expect(page.getByText('Indiquez le loyer hors charges.').filter({ visible: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('button', { name: 'Créer le bail' })).toBeVisible();

    // Saisie commencée : « Quitter » demande confirmation, « Continuer la saisie » garde l'écran
    await page.getByRole('button', { name: 'Quitter' }).click();
    const fenetre = page.getByRole('dialog', { name: 'Quitter sans enregistrer ?' });
    await expect(fenetre).toBeVisible();
    await fenetre.getByRole('button', { name: 'Continuer la saisie' }).click();
    await expect(fenetre).toBeHidden();
    await expect(page.getByRole('button', { name: 'Créer le bail' })).toBeVisible();
  });

  test('bail : création interceptée, corps vérifié', async ({ page }) => {
    const creation = await intercepter(page, 'POST', '/contrats');
    await page.goto(`/biens/${DEMO.bienLoueClaire}/bail/nouveau`);
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Créer le bail' }).click();

    const requete = await creation.requete();
    expect(requete.corps).toEqual({
      bienId: DEMO.bienLoueClaire,
      emailLocataire: COMPTES.lucas.email,
      dateDebut: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      dureeBailMois: 12,
      loyerMensuel: 325,
      chargesMensuelles: 40,
      depotGarantie: 650,
    });
    await expect(page).toHaveURL(`/biens/${DEMO.bienLoueClaire}/bail`);
    await expect(page.getByText('Bail créé. Signez-le pour l’envoyer au locataire.')).toBeVisible();
  });

  test('état des lieux : assistant pièce par pièce, sans bloc photos, création interceptée', async ({ page }) => {
    const creation = await intercepter(page, 'POST', '/etats-des-lieux');
    await page.goto(`/biens/${DEMO.bienLoueClaire}/etats-des-lieux/nouveau`);
    await pagePrete(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Type et date');
    await page.getByRole('button', { name: 'Continuer' }).click();

    // Compteurs du pays : un relevé par compteur
    const releves = page.getByLabel('Relevé');
    const n = await releves.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) await releves.nth(i).fill(String(1000 + i));
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click(); // clés : porte d'entrée proposée

    // Pièces
    await expect(page.getByText('Ajoutez au moins une pièce.').first()).toBeVisible();
    await page.getByRole('group', { name: 'Ajouter une pièce' }).getByRole('button', { name: 'Salon' }).click();
    if (surTelephone(page) && !(await page.getByLabel('Nom de la pièce').isVisible())) {
      await page.getByRole('button', { name: /^Salon/ }).first().click();
    }
    await expect(page.getByLabel('Nom de la pièce')).toHaveValue('Salon');
    const etatMur = page.getByRole('radiogroup', { name: 'État : Mur' });
    await etatMur.getByRole('radio', { name: 'Hors service' }).click();
    await expect(etatMur.getByRole('radio', { name: 'Hors service' })).toBeChecked();
    if (surTelephone(page)) {
      await expect(etatMur.getByRole('radio', { name: 'Hors service' })).toHaveText(/H\.S\./);
      await expect(etatMur.getByText('H.S.', { exact: true })).toBeVisible();
    } else {
      await expect(etatMur.getByText('Hors service', { exact: true })).toBeVisible();
    }
    // Évolution E1 : pas de photos de pièce
    await expect(page.getByText(/photo/i)).toHaveCount(0);

    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Créer l’état des lieux' }).click();

    const corps = (await creation.requete()).corps as Record<string, unknown> & { pieces: { nomPiece: string; elements: { typeElement: string; etatElement: string }[] }[] };
    expect(corps).toMatchObject({ bienId: DEMO.bienLoueClaire, emailLocataire: COMPTES.lucas.email, type: 'ENTREE' });
    expect(Object.keys(corps).sort()).toEqual(
      expect.arrayContaining(['bienId', 'cles', 'compteurs', 'dateRealisation', 'emailLocataire', 'pieces', 'type']),
    );
    expect(corps.pieces).toHaveLength(1);
    expect(corps.pieces[0]).toMatchObject({ nomPiece: 'Salon', ordre: 1 });
    expect(corps.pieces[0].elements).toContainEqual({ typeElement: 'MUR', etatElement: 'HORS_SERVICE' });
    expect((corps['compteurs'] as unknown[]).length).toBe(n);

    // Création réussie : la sortie n'est plus retenue par la garde
    await expect(page).toHaveURL(`/biens/${DEMO.bienLoueClaire}/etats-des-lieux`);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('quittances : tableau sur ordinateur, une carte par ligne sur téléphone', async ({ page }) => {
    await page.goto(`/biens/${DEMO.bienLoueClaire}/quittances`);
    const tableau = page.getByRole('table', { name: 'Quittances du bien' });
    const lignes = tableau.getByRole('rowgroup').nth(1).getByRole('row');
    await expect(lignes).toHaveCount(3);
    await expect(lignes.nth(0).getByRole('cell').first()).toHaveText('novembre 2026');
    await expect(lignes.nth(1)).toContainText('Loyer reçu');
    await expect(lignes.nth(1).getByRole('link', { name: 'Quittance de octobre 2026 (PDF)' })).toBeVisible();

    const affichage = await lignes.first().evaluate(el => getComputedStyle(el).display);
    const entete = tableau.getByRole('rowgroup').first();
    if (surTelephone(page)) {
      expect(affichage).not.toBe('table-row');
      // Chaque carte occupe la largeur du tableau
      const [carte, cadre] = await Promise.all([lignes.first().boundingBox(), tableau.boundingBox()]);
      expect(carte!.width).toBeGreaterThan(cadre!.width * 0.9);
    } else {
      expect(affichage).toBe('table-row');
      await expect(entete.getByRole('columnheader')).toHaveText(['Mois', 'Montant', 'Échéance', 'Paiement', 'État', 'Actions']);
    }
  });

  test('messagerie : la conversation s’ouvre, la navigation reste, message intercepté', async ({ page }) => {
    const messagerie = await intercepterMessagerie(page);
    await page.goto('/messages');
    const conversations = page.getByRole('region', { name: 'Conversations' });
    // Ouvrir la conversation, puis attendre son historique (GET /historique)
    const ouvrir = async () => {
      const historique = page.waitForResponse(r => r.url().startsWith(`${API}/historique`));
      await conversations.getByRole('button', { name: /Inès Moreau/ }).click();
      await historique;
    };
    await ouvrir();

    const champ = page.getByLabel('Message à Inès Moreau');
    await expect(champ).toBeVisible();
    await expect(page.getByText('Reconnexion…')).toBeHidden({ timeout: 20_000 });
    if (surTelephone(page)) {
      // Plein écran : retour vers la liste
      await expect(navigation(page)).toBeHidden();
      await page.getByRole('button', { name: 'Retour aux conversations' }).click();
      await expect(conversations.getByRole('button', { name: /Inès Moreau/ })).toBeVisible();
      await ouvrir();
    } else {
      // La barre latérale reste quand une conversation est ouverte
      await expect(navigation(page)).toBeVisible();
      await expect(conversations).toBeVisible();
    }

    await champ.fill('Message de test e2e (intercepté)');
    await page.getByRole('button', { name: 'Envoyer' }).click();
    const envoi = await messagerie.envoi();
    expect(envoi.destination).toBe('/app/chat.send');
    expect(envoi.corps).toEqual({
      contenu: 'Message de test e2e (intercepté)',
      emailDestinataire: COMPTES.ines.email,
      bienId: DEMO.bienVacantClaire,
    });
    await expect(page.getByText('Message de test e2e (intercepté)').filter({ visible: true }).first()).toBeVisible();
  });

  test('messagerie : filtre « Non lues »', async ({ page }) => {
    await page.goto('/messages');
    await pagePrete(page);
    const filtre = page.getByRole('group', { name: 'Filtrer les conversations' });
    const reponse = page.waitForResponse(r => r.url() === `${API}/conversations/search` && r.request().postDataJSON()?.lu === false);
    await filtre.getByRole('button', { name: /^Non lues/ }).click();
    await expect(filtre.getByRole('button', { name: /^Non lues/ })).toHaveAttribute('aria-pressed', 'true');
    const nonLues = ((await (await reponse).json()) as { contenu: unknown[] }).contenu.length;
    const liste = page.getByRole('region', { name: 'Conversations' }).getByRole('listitem');
    if (nonLues === 0) {
      await expect(page.getByText('Aucun message non lu')).toBeVisible();
    } else {
      await expect(liste).toHaveCount(nonLues);
    }
    await filtre.getByRole('button', { name: 'Toutes' }).click();
    await expect(liste.first()).toBeVisible();
  });
});

test.describe('Propriétaire (Patrick, RDC)', () => {
  test.use({ compte: 'patrick' });

  test('accueil et fiche du bien loué à Grâce, en dollars', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/accueil$/);
    await expect(page.getByRole('main').getByText(`${COMPTES.patrick.nom} · 6 biens`)).toBeVisible();
    const chiffres = page.getByRole('region', { name: 'Chiffres du mois' });
    await expect(chiffres).toContainText(/Biens loués\s*1 sur 6/);
    await expect(chiffres).toContainText(/Loyer attendu en \p{L}+ 480\s\$US/u);

    const carte = page.getByRole('region', { name: 'Maison 4 pièces à Yolo (Kalamu)' });
    await expect(carte).toContainText('Loué à Grâce Mukendi');
    await expect(carte.getByRole('list', { name: 'Où en est la location' })).toContainText('En attente de Grâce');
    await carte.getByRole('link', { name: 'Maison 4 pièces à Yolo (Kalamu)' }).click();

    await expect(page).toHaveURL(`/biens/${DEMO.bienLouePatrick}`);
    await expect(page.getByRole('main')).toContainText(/480\s\$US par mois/);
    await expect(page.getByRole('main')).toContainText('commune de Kalamu, Kinshasa');
    await sections(page).getByRole('link', { name: 'Bail' }).click();
    const conditions = page.getByRole('region', { name: 'Conditions' });
    await expect(conditions.getByRole('term').filter({ hasText: /^Garantie$/ })).toBeVisible();
    await expect(conditions.getByRole('term').filter({ hasText: 'Loyers d’avance' })).toBeVisible();
  });

  test('quittances en dollars : le rappel WhatsApp est dans les actions de la quittance', async ({ page }) => {
    await page.goto(`/biens/${DEMO.bienLouePatrick}/quittances`);
    const lignes = page.getByRole('table', { name: 'Quittances du bien' }).getByRole('rowgroup').nth(1).getByRole('row');
    await expect(lignes.first()).toContainText(/480,00\s\$US/);
    const lien = page.waitForResponse(r => /\/quittances\/\d+\/lien-whatsapp$/.test(new URL(r.url()).pathname));
    await lignes.first().getByRole('button', { name: /^Actions sur la quittance/ }).click();
    expect((await lien).status()).toBe(200);
    await expect(page.getByRole('dialog').getByRole('link', { name: /Rappel par WhatsApp/ })).toBeVisible();
  });
});
