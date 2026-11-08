import type { Locator, Page } from '@playwright/test';
import { API } from '../outils/global-setup';
import { contrat, erreurApi, etatDesLieux, intercepter, simuler } from '../outils/simul';
import { expect, pagePrete, surTelephone, test } from '../outils/test';

/**
 * Signature sans compte par le lien reçu par e-mail (parcours P4). Le lien valide, expiré ou déjà signé est simulé
 * (jeton factice) ; le lien inconnu est un vrai 404 de l'API. La signature n'atteint jamais l'API.
 */

const JETON = 'jeton-simule-e2e';
const BAIL = contrat();
const EDL = etatDesLieux();

/** Trace une signature dans le cadre : souris sur ordinateur, doigt (événements tactiles) sur téléphone. */
async function signer(page: Page, cadre: Locator): Promise<void> {
  const boite = (await cadre.boundingBox())!;
  const points = Array.from({ length: 12 }, (_, i) => ({
    x: Math.round(boite.x + boite.width * (0.15 + i * 0.06)),
    y: Math.round(boite.y + boite.height * (0.5 + (i % 2 ? 0.2 : -0.2))),
  }));
  if (surTelephone(page)) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[0]] });
    for (const p of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 3 });
    await page.mouse.up();
  }
}

const SIGNATURE_IMAGE = /^(data:image\/png;base64,)?[A-Za-z0-9+/]+=*$/;

test.describe('Lien de signature du bail', () => {
  test('lien valide : aperçu, case « J’ai lu… », signature tracée, POST intercepté, « Bail signé »', async ({ page }) => {
    await simuler(page, 'GET', `/contrats/signer/${JETON}`, BAIL);
    const signature = await intercepter(page, 'POST', `/contrats/signer/${JETON}`);
    await page.goto(`/contrats/signer/${JETON}`);

    // Aperçu construit avec les champs du contrat
    const apercu = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Contrat de location' }) });
    await expect(apercu).toContainText('Claire Martin, bailleur, et Inès Moreau, locataire.');
    await expect(apercu).toContainText(`${BAIL.adresseBien}.`);
    await expect(apercu).toContainText(/Loyer mensuel de 965,00\s€ hors charges/);
    await expect(apercu).toContainText(/Signé par Claire Martin le \d{1,2} \p{L}+ \d{4}/u);

    const signerBouton = page.getByRole('button', { name: 'Signer le bail' });
    await expect(signerBouton).toBeDisabled();
    await page.getByLabel('J’ai lu le bail en entier et j’accepte de le signer').check();
    await expect(signerBouton).toBeEnabled();
    await signerBouton.click();

    const fenetre = page.getByRole('dialog', { name: 'Votre signature' });
    await expect(fenetre).toBeVisible();
    const valider = fenetre.getByRole('button', { name: 'Valider ma signature' });
    await expect(valider).toBeDisabled();
    await signer(page, fenetre.getByLabel('Zone de signature : dessinez votre signature'));
    await expect(valider).toBeEnabled();
    await valider.click();

    const requete = await signature.requete();
    expect(requete.methode).toBe('POST');
    expect(Object.keys(requete.corps as object)).toEqual(['signatureBase64']);
    const image = (requete.corps as { signatureBase64: string }).signatureBase64;
    expect(image).toMatch(SIGNATURE_IMAGE);
    expect(image.length).toBeGreaterThan(500);

    await expect(page.getByRole('heading', { level: 1, name: 'Bail signé' })).toBeVisible();
    await expect(page.getByText('Signé par les deux parties').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/auth/login');
  });

  test('PDF : le clic relance le GET puis ouvre l’adresse fraîche', async ({ page, context }) => {
    test.skip(surTelephone(page), 'Même mécanisme sur téléphone ; l’onglet ouvert est vérifié sur ordinateur');
    let lectures = 0;
    await simuler(page, 'GET', `/contrats/signer/${JETON}`, () => {
      lectures += 1;
      return { ...BAIL, urlPdf: `${API}/simule/bail-${lectures}.pdf?X-Amz-Signature=${lectures}` };
    });
    await context.route(`${API}/simule/**`, r => r.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' }));
    await page.goto(`/contrats/signer/${JETON}`);
    await pagePrete(page);
    expect(lectures).toBe(1);

    // L'onglet s'ouvre au clic, puis charge l'adresse de la seconde lecture (Edge sans interface la télécharge)
    const pdf = context.waitForEvent('request', r => r.url().startsWith(`${API}/simule/`));
    const [onglet] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Télécharger le PDF pour le relire' }).click(),
    ]);
    expect(onglet).toBeTruthy();
    await expect.poll(() => lectures).toBe(2);
    expect((await pdf).url()).toBe(`${API}/simule/bail-2.pdf?X-Amz-Signature=2`);
  });

  const INVALIDES = [
    { cas: 'expiré (410 simulé)', statut: 410, titre: 'Ce lien a expiré', message: 'Ce lien de signature a expiré. Demandez au propriétaire de vous en renvoyer un.' },
    { cas: 'déjà signé (409 simulé)', statut: 409, titre: 'Le bail n’attend plus votre signature', message: 'Ce bail a déjà été signé.' },
  ];
  for (const { cas, statut, titre, message } of INVALIDES) {
    test(`lien ${cas} : écran dédié`, async ({ page }) => {
      await simuler(page, 'GET', `/contrats/signer/${JETON}`, erreurApi(statut, message), statut);
      await page.goto(`/contrats/signer/${JETON}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(titre);
      await expect(page.getByText(message)).toBeVisible();
      await expect(page.getByRole('button', { name: /Signer/ })).toHaveCount(0);
    });
  }

  test('lien inconnu (404 réel de l’API) : écran dédié', async ({ page }) => {
    const reponse = page.waitForResponse(r => r.url() === `${API}/contrats/signer/jeton-inconnu-e2e`);
    await page.goto('/contrats/signer/jeton-inconnu-e2e');
    expect((await reponse).status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ce lien n’est pas valide');
    await expect(page.getByText('Lien de signature invalide. Ouvrez le dernier lien reçu par e-mail.')).toBeVisible();
  });

  test('trois messages distincts pour 404, 410 et 409', async ({ page }) => {
    let statut = 404;
    await page.route(`${API}/contrats/signer/${JETON}`, r =>
      r.fulfill({ status: statut, contentType: 'application/json', body: JSON.stringify(erreurApi(statut, `Refus ${statut}`)) }),
    );
    const ecrans: string[] = [];
    for (statut of [404, 410, 409]) {
      await page.goto(`/contrats/signer/${JETON}`);
      const titre = page.getByRole('heading', { level: 1 });
      await expect(titre).not.toHaveText('Signature du bail');
      ecrans.push(`${await titre.textContent()} | ${await page.getByRole('main').textContent()}`);
    }
    expect(new Set(ecrans.map(e => e.split(' | ')[0])).size).toBe(3);
    expect(new Set(ecrans).size).toBe(3);
  });

  test('téléphone : relire, signer au doigt, confirmation', async ({ page }) => {
    test.skip(!surTelephone(page), 'Parcours en trois étapes du téléphone (Signer-Mobile)');
    await simuler(page, 'GET', `/contrats/signer/${JETON}`, BAIL);
    await intercepter(page, 'POST', `/contrats/signer/${JETON}`);
    await page.goto(`/contrats/signer/${JETON}`);

    // 1. Relire : résumé au-dessus de l'aperçu, case et bouton collés en bas
    const resume = page.getByRole('region', { name: 'Résumé du bail' });
    await expect(resume).toBeVisible();
    await expect(resume).toContainText(BAIL.adresseBien!);
    const bouton = page.getByRole('button', { name: 'Signer le bail' });
    const hauteur = page.viewportSize()!.height;
    expect((await bouton.boundingBox())!.y).toBeGreaterThan(hauteur * 0.6);

    // 2. Signer au doigt dans le panneau qui monte
    await page.getByLabel('J’ai lu le bail en entier et j’accepte de le signer').check();
    await bouton.click();
    const fenetre = page.getByRole('dialog', { name: 'Votre signature' });
    const boite = (await fenetre.boundingBox())!;
    expect(Math.round(boite.y + boite.height)).toBeGreaterThanOrEqual(hauteur - 2);
    await signer(page, fenetre.getByLabel('Zone de signature : dessinez votre signature'));
    await fenetre.getByRole('button', { name: 'Valider ma signature' }).click();

    // 3. Confirmation
    await expect(page.getByRole('heading', { level: 1, name: 'Bail signé' })).toBeVisible();
  });
});

test.describe('Lien de signature de l’état des lieux', () => {
  test('lien valide : case « J’ai lu… », signature, POST intercepté, « État des lieux signé »', async ({ page }) => {
    await simuler(page, 'GET', `/etats-des-lieux/signer/${JETON}`, EDL);
    const signature = await intercepter(page, 'POST', `/etats-des-lieux/signer/${JETON}`);
    await page.goto(`/edl/signer/${JETON}`);

    await expect(page.getByRole('main')).toContainText('Séjour');
    await expect(page.getByRole('main')).toContainText(/Signé par Claire Martin le \d{1,2} \p{L}+ \d{4}/u);
    const signerBouton = page.getByRole('button', { name: 'Signer l’état des lieux' });
    await expect(signerBouton).toBeDisabled();
    await page.getByLabel('J’ai lu l’état des lieux en entier et j’accepte de le signer').check();
    await signerBouton.click();

    const fenetre = page.getByRole('dialog', { name: 'Votre signature' });
    await signer(page, fenetre.getByLabel('Zone de signature : dessinez votre signature'));
    await fenetre.getByRole('button', { name: 'Valider ma signature' }).click();

    const requete = await signature.requete();
    expect(Object.keys(requete.corps as object)).toEqual(['signatureBase64']);
    expect((requete.corps as { signatureBase64: string }).signatureBase64).toMatch(SIGNATURE_IMAGE);
    await expect(page.getByRole('heading', { level: 1, name: 'État des lieux signé' })).toBeVisible();
  });

  test('ancienne adresse /etats-des-lieux/signer/:token redirigée', async ({ page }) => {
    await simuler(page, 'GET', `/etats-des-lieux/signer/${JETON}`, EDL);
    await page.goto(`/etats-des-lieux/signer/${JETON}`);
    await expect(page).toHaveURL(`/edl/signer/${JETON}`);
  });

  test('lien expiré (410 simulé) et inconnu (404 réel)', async ({ page }) => {
    await simuler(page, 'GET', `/etats-des-lieux/signer/${JETON}`, erreurApi(410, 'Expiré'), 410);
    await page.goto(`/edl/signer/${JETON}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ce lien a expiré');

    const reponse = page.waitForResponse(r => r.url() === `${API}/etats-des-lieux/signer/jeton-inconnu-e2e`, { timeout: 45_000 });
    await page.goto('/edl/signer/jeton-inconnu-e2e');
    expect((await reponse).status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ce lien n’est pas valide');
  });
});
