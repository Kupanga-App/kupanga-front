import type { Page } from '@playwright/test';
import { COMPTES, DEMO } from '../outils/comptes';
import { finDeReservation } from '../../src/app/features/biens/models/location.model';
import { intercepter, location, simuler } from '../outils/simul';
import { expect, pagePrete, surTelephone, test } from '../outils/test';

/** Parcours P6 et P7 (locataire) avec Lucas (France) puis Grâce (RDC) ; logement réservé simulé. */

const ongletsLogement = (page: Page) => page.getByRole('navigation', { name: 'Mon logement' });

test.describe('Locataire (Lucas, France)', () => {
  test.use({ compte: 'lucas' });

  test('arrivée directe sur Mon logement, barre du haut ou onglets du bas', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/mon-logement$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Studio proche transports, Brotteaux');
    await expect(page.getByRole('main')).toContainText('propriétaire : Claire M.');

    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    if (surTelephone(page)) {
      await expect(nav.getByRole('link')).toHaveText(['Accueil', 'Mon logement', 'Messages', 'Documents', 'Compte']);
    } else {
      await expect(nav.getByRole('link')).toHaveText(['Accueil', 'Mon logement', 'Explorer']);
      await expect(page.getByRole('link', { name: /^Notifications/ })).toBeVisible();
      // Menu du compte (avatar + nom)
      await page.getByRole('button', { name: 'Lucas B.' }).click();
      const menu = page.getByRole('menu', { name: 'Compte' });
      await expect(menu.getByRole('menuitem')).toHaveText(['Compte', 'Documents', 'Messages', 'Demandes de location', 'Déconnexion'].map(t => new RegExp(t)));
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
    }
    // Pas de barre latérale de propriétaire
    await expect(page.getByRole('link', { name: /^Mes biens/ })).toHaveCount(0);
  });

  test('onglets Logement, Documents, Quittances, Messages', async ({ page }) => {
    await page.goto('/mon-logement');
    const onglets = ongletsLogement(page);
    await expect(onglets.getByRole('link')).toHaveText(['Logement', 'Documents', 'Quittances', 'Messages']);
    await expect(page.getByRole('region', { name: 'Mon loyer' })).toContainText('365 €');
    await expect(page.getByRole('list', { name: 'Où en est votre location' }).getByRole('listitem')).toHaveCount(5);

    await onglets.getByRole('link', { name: 'Quittances' }).click();
    await expect(page).toHaveURL(/\/quittances$/);
    await expect(ongletsLogement(page).getByRole('link', { name: 'Quittances' })).toHaveAttribute('aria-current', 'page');

    await ongletsLogement(page).getByRole('link', { name: 'Documents' }).click();
    await expect(page).toHaveURL(/\/documents$/);

    await page.goto('/mon-logement');
    // Le lien reçoit le bien et la propriétaire une fois le logement chargé
    const messages = ongletsLogement(page).getByRole('link', { name: 'Messages' });
    await expect(messages).toHaveAttribute('href', `/messages?bienId=${DEMO.bienLoueClaire}&interlocuteur=${COMPTES.claire.email}`);
    await messages.click();
    // La conversation avec la propriétaire s'ouvre (l'adresse est ensuite simplifiée en /messages)
    await expect(page).toHaveURL(/\/messages/);
    await expect(page.getByLabel(/^Message à (Claire|claire.martin)/)).toBeVisible();
  });

  test('quittances groupées par année', async ({ page }) => {
    await page.goto('/quittances');
    const annee = page.getByRole('heading', { level: 2, name: '2026', exact: true });
    await expect(annee).toBeVisible();
    await expect(page.getByText('3 quittances')).toBeVisible();
    const lignes = page.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
    await expect(lignes).toHaveCount(3);
    await expect(lignes.nth(0)).toContainText('novembre 2026');
    await expect(lignes.nth(1)).toContainText('Loyer reçu');
    await expect(lignes.nth(1).getByRole('link', { name: 'Télécharger la quittance d’octobre 2026' })).toBeVisible();
    await expect(lignes.nth(2)).toContainText('septembre 2026');
  });

  test('« Donner congé » : fenêtre, requête interceptée et vérifiée', async ({ page }) => {
    const conge = await intercepter(page, 'POST', /^\/locations\/\d+\/conge$/, location({ statut: 'ACTIVE' }));
    await page.goto('/mon-logement');
    await pagePrete(page);
    await page.getByRole('region', { name: 'Fin de location' }).getByRole('button', { name: 'Donner congé' }).click();
    const fenetre = page.getByRole('dialog', { name: 'Donner congé' });
    await expect(fenetre).toBeVisible();
    await expect(fenetre).toContainText('Le propriétaire sera prévenu par notification et par e-mail.');
    const valider = fenetre.getByRole('button', { name: 'Confirmer' });
    await expect(valider).toBeDisabled();

    // Dernier jour : le 15 du mois suivant
    await fenetre.getByLabel('Dernier jour de la location').click();
    const calendrier = page.getByRole('dialog', { name: 'Choisir une date' });
    await calendrier.getByRole('button', { name: 'Mois suivant' }).click();
    const jour = calendrier.locator('button.jour:not(.hors-mois):not([aria-disabled])').nth(14);
    const iso = await jour.getAttribute('data-iso');
    await jour.click();
    await expect(valider).toBeEnabled();
    await valider.click();

    const requete = await conge.requete();
    expect(requete.url.pathname).toMatch(/^\/locations\/\d+\/conge$/);
    expect(requete.corps).toEqual({ dateFin: iso });
  });
});

test.describe('Locataire (Grâce, RDC)', () => {
  test.use({ compte: 'grace' });

  test('Mon logement : bail à signer, lien personnel', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/mon-logement$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Maison 4 pièces à Yolo (Kalamu)');
    const aFaire = page.getByRole('region', { name: 'Signer le bail envoyé par Patrick M.' });
    await expect(aFaire).toBeVisible();
    // Le lien est vérifié sans être suivi : la signature réelle n'est pas faite par les tests
    await expect(aFaire.getByRole('link', { name: 'Lire et signer' })).toHaveAttribute('href', /^\/contrats\/signer\/[\w-]+$/);
    const frise = page.getByRole('list', { name: 'Où en est votre location' });
    await expect(frise.getByRole('listitem').nth(2)).toContainText('Votre signature');
    await expect(frise.getByRole('listitem').nth(2)).toContainText('À faire');
  });
});

test.describe('Logement réservé (simulé)', () => {
  test.use({ compte: 'ines' });

  test('compte à rebours et frise', async ({ page }) => {
    const reservation = location({ dateExpiration: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 10);
      d.setHours(23, 0, 0, 0);
      return d.toISOString().slice(0, 19);
    })() });
    await simuler(page, 'GET', '/locations/reservations', [reservation]);
    await page.goto('/mon-logement');

    const bloc = page.getByRole('main');
    await expect(bloc.getByText('Logement réservé pour vous')).toBeVisible();
    await expect(bloc).toContainText('Appartement T3 avec parking, Brotteaux');
    await expect(bloc).toContainText(`Réservé jusqu’au ${finDeReservation(reservation.dateExpiration)}`);
    await expect(bloc).toContainText(/J-1[01] · il reste 1[01] jours/);
    await expect(page.getByRole('progressbar').or(bloc.locator('[role="meter"]')).first()).toBeAttached();
    const frise = page.getByRole('list', { name: 'Où en est votre location' });
    await expect(frise.getByRole('listitem')).toHaveCount(5);
    await expect(frise.getByRole('listitem').first()).toContainText('Demande acceptée');
    await expect(bloc.getByRole('button', { name: 'Se désister' })).toBeVisible();
  });
});
