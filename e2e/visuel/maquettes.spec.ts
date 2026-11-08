import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '../outils/test';
import { ECRANS_ORDINATEUR, ECRANS_TELEPHONE, afficher, masques, type Ecran } from './ecrans';
import { comparer, decouper } from './images';

/**
 * Conformité aux maquettes (projet `conformite`, non bloquant) : chaque écran principal est capturé à la taille de
 * sa maquette, masques posés, puis comparé au PNG de `../frontend-audit/maquettes/png/`, copié (ou découpé pour les
 * planches de téléphones) dans e2e/visuel/maquettes/.
 *
 * Seuil large et assumé : les maquettes montrent des données inventées, des photos en aplat et des éléments non
 * construits (évolutions E1 à E13). `SEUIL` = part de pixels différents au-delà de laquelle l'écran est signalé ;
 * un pixel diffère quand sa couleur s'écarte de plus de 30 % (`threshold: 0.3` de Playwright).
 * Le tableau (ratio, image de différence, écarts connus) est écrit dans e2e/visuel/conformite/.
 */
const SEUIL = 0.35;
const DOSSIER_MAQUETTES = path.join(__dirname, 'maquettes');
const SOURCE = path.resolve(__dirname, '..', '..', '..', 'frontend-audit', 'maquettes', 'png');
const SORTIE = path.join(__dirname, 'conformite');
const COULEUR_MASQUE = '#E6EAE0'; // aplat vert-gris des photos dans les maquettes

export interface Resultat { nom: string; maquette: string; ratio: number; seuil: number; ecarts: string; difference: string }

/** Instantané attendu : le PNG de la maquette, ou le téléphone découpé dans la planche. */
async function maquetteAttendue(browser: import('@playwright/test').Browser, ecran: Ecran): Promise<Buffer> {
  const fichier = path.join(DOSSIER_MAQUETTES, `${ecran.nom}.png`);
  if (fs.existsSync(fichier)) return fs.readFileSync(fichier);
  const source = fs.readFileSync(path.join(SOURCE, `${ecran.maquette!.png}.png`));
  const png = ecran.maquette!.decoupe
    ? await decouper(browser, source, ecran.maquette!.decoupe.x, ecran.maquette!.decoupe.y, 390, 844)
    : source;
  fs.mkdirSync(DOSSIER_MAQUETTES, { recursive: true });
  fs.writeFileSync(fichier, png);
  return png;
}

function verifier(ecran: Ecran) {
  test(`${ecran.nom} conforme à la maquette`, async ({ page, browser }, info) => {
    if (!ecran.telephone) await page.setViewportSize({ width: 1440, height: ecran.hauteur ?? 900 });
    const attendue = await maquetteAttendue(browser, ecran);
    await afficher(page, ecran);
    const capture = await page.screenshot({ mask: masques(page, ecran), maskColor: COULEUR_MASQUE, animations: 'disabled', scale: 'css' });

    const { ratio, difference } = await comparer(browser, capture, attendue, 0.3);
    fs.mkdirSync(SORTIE, { recursive: true });
    fs.writeFileSync(path.join(SORTIE, `${ecran.nom}-capture.png`), capture);
    fs.writeFileSync(path.join(SORTIE, `${ecran.nom}-difference.png`), difference);
    await info.attach(`${ecran.nom}-difference`, { body: difference, contentType: 'image/png' });
    info.annotations.push({ type: 'ratio', description: `${(ratio * 100).toFixed(1)} % de pixels différents` });
    // Un fichier par écran ; le tableau est assemblé à la fin de l'exécution (outils/global-teardown.ts)
    const resultat: Resultat = { nom: ecran.nom, maquette: `${ecran.maquette!.png}.png`, ratio, seuil: SEUIL, ecarts: ecran.ecarts ?? '', difference: `${ecran.nom}-difference.png` };
    fs.mkdirSync(path.join(SORTIE, 'resultats'), { recursive: true });
    fs.writeFileSync(path.join(SORTIE, 'resultats', `${ecran.nom}.json`), JSON.stringify(resultat, null, 2));

    expect.soft(capture).toMatchSnapshot(`${ecran.nom}.png`, { maxDiffPixelRatio: SEUIL, threshold: 0.3 });
  });
}

test.describe('Ordinateur (1440 px)', () => {
  for (const ecran of ECRANS_ORDINATEUR) {
    test.describe(ecran.nom, () => {
      test.use({ compte: ecran.compte });
      verifier(ecran);
    });
  }
});

test.describe('Téléphone (390 × 844)', () => {
  for (const ecran of ECRANS_TELEPHONE) {
    test.describe(ecran.nom, () => {
      test.use({ compte: ecran.compte, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      verifier(ecran);
    });
  }
});
