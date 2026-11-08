import type { Page } from '@playwright/test';
import { demandeLocation, intercepter, simuler } from '../outils/simul';
import { expect, surTelephone, test } from '../outils/test';

/** Parcours P3 côté candidat (Inès) : accueil, demande de location simulée, Accepter (intercepté), Refuser. */

test.use({ compte: 'ines' });

const DEMANDE = demandeLocation();

/** Candidat sans logement : aucune réservation, une demande reçue (états simulés). */
async function candidatAvecDemande(page: Page) {
  await simuler(page, 'GET', '/locations/reservations', []);
  await simuler(page, 'GET', '/demandes-location/recues', [DEMANDE]);
}

test('accueil candidat : navigation sans « Favoris »', async ({ page }) => {
  await simuler(page, 'GET', '/locations/reservations', []);
  await simuler(page, 'GET', '/demandes-location/recues', []);
  await page.goto('/');
  await expect(page).toHaveURL(/\/accueil$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Votre recherche de logement');
  await expect(page.getByRole('main')).toContainText('Inès Moreau');

  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  const attendus = surTelephone(page)
    ? ['Accueil', 'Explorer', 'Demandes', /Messages/, 'Compte']
    : ['Accueil', 'Explorer', 'Demandes', /Messages/];
  await expect(nav.getByRole('link')).toHaveText(attendus);
  // Évolution E4 : pas de favoris
  await expect(page.getByText('Favoris')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Annonces et carte/ })).toBeVisible();
});

test('demande à traiter : « Accepter » envoie la même requête qu’avant (interceptée)', async ({ page }) => {
  await candidatAvecDemande(page);
  const accepter = await intercepter(page, 'POST', `/demandes-location/${DEMANDE.id}/accepter`, { ...DEMANDE, statut: 'ACCEPTEE' });
  await page.goto('/accueil');

  const bloc = page.getByRole('main');
  await expect(bloc.getByText('Demande de location à traiter')).toBeVisible();
  await expect(bloc).toContainText('Claire M. vous propose la location d’Appartement T3 avec parking, Brotteaux');
  await bloc.getByRole('button', { name: 'Accepter' }).click();

  // DemandeLocationService.accepter : POST /demandes-location/{id}/accepter, sans corps
  const requete = await accepter.requete();
  expect(requete.methode).toBe('POST');
  expect(requete.url.pathname).toBe(`/demandes-location/${DEMANDE.id}/accepter`);
  expect(requete.url.search).toBe('');
  expect(requete.brut ?? '').toBe('');
  expect(accepter.nombre()).toBe(1);
});

test('demande à traiter : « Refuser » demande confirmation', async ({ page }) => {
  await candidatAvecDemande(page);
  const refuser = await intercepter(page, 'POST', `/demandes-location/${DEMANDE.id}/refuser`, { ...DEMANDE, statut: 'REFUSEE' });
  await page.goto('/accueil');

  await page.getByRole('main').getByRole('button', { name: 'Refuser' }).click();
  const fenetre = page.getByRole('dialog', { name: 'Refuser la demande' });
  await expect(fenetre).toBeVisible();
  await fenetre.getByRole('button', { name: 'Annuler' }).click();
  await expect(fenetre).toBeHidden();
  expect(refuser.nombre()).toBe(0);

  // Confirmé : la requête part (interceptée)
  await page.getByRole('main').getByRole('button', { name: 'Refuser' }).click();
  await fenetre.getByRole('button', { name: 'Refuser' }).click();
  const requete = await refuser.requete();
  expect(requete.url.pathname).toBe(`/demandes-location/${DEMANDE.id}/refuser`);
});
