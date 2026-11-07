import fs from 'node:fs';
import path from 'node:path';
import { cle, type Appel } from '../outils/journal';
import { expect, pagePrete, test } from '../outils/test';
import { CIBLE, servirReference } from './cible';
import { ECRANS, cleEcran } from './scenario';
import { exceptionsPour } from './exceptions';

/**
 * Non-régression des appels à l'API : la refonte fait les mêmes appels que la branche d'origine, avec les mêmes
 * réponses. KP_CIBLE=reference enregistre la branche d'origine dans reference.json (voir e2e/README.md) ; sans
 * variable, la refonte est comparée à ce fichier, écran par écran.
 */

const FICHIER = path.join(__dirname, 'reference.json');
interface Enregistrement {
  enregistreLe: string;
  branche: string;
  ecrans: Record<string, Appel[]>;
}

const releves: Record<string, Appel[]> = {};

test.describe.configure({ mode: CIBLE === 'reference' ? 'serial' : 'parallel' });

for (const ecran of ECRANS) {
  test.describe(cleEcran(ecran), () => {
    test.use({ compte: ecran.compte });

    test(`appels de ${cleEcran(ecran)}`, async ({ page, context, journal }) => {
      if (CIBLE === 'reference') await servirReference(context);
      await page.goto(ecran.route);
      await pagePrete(page, 20_000);
      // Les appels différés (compteurs, conversations) partent après le premier rendu
      await page.waitForTimeout(1_500);
      await pagePrete(page, 10_000);
      const appels = (await journal.ensemble()).filter(a => a.statut !== undefined);

      if (CIBLE === 'reference') {
        releves[cleEcran(ecran)] = appels;
        return;
      }

      test.skip(!fs.existsSync(FICHIER), 'reference.json absent : enregistrer d’abord la référence');
      const reference = (JSON.parse(fs.readFileSync(FICHIER, 'utf8')) as Enregistrement).ecrans[cleEcran(ecran)];
      expect(reference, `écran absent de reference.json : ${cleEcran(ecran)}`).toBeDefined();
      comparer(cleEcran(ecran), reference, appels);
    });
  });
}

test.afterAll(async () => {
  if (CIBLE !== 'reference' || !Object.keys(releves).length) return;
  const enregistrement: Enregistrement = {
    enregistreLe: new Date().toISOString(),
    branche: 'feature/pret-pour-la-prod',
    ecrans: Object.fromEntries(Object.entries(releves).sort(([a], [b]) => a.localeCompare(b))),
  };
  fs.writeFileSync(FICHIER, JSON.stringify(enregistrement, null, 2) + '\n');
});

/** Mêmes appels (méthode + chemin), mêmes clés de corps et de paramètres, mêmes réponses GET ; sauf exceptions. */
function comparer(ecran: string, reference: Appel[], refonte: Appel[]): void {
  const parCle = (liste: Appel[]) => {
    const m = new Map<string, Appel[]>();
    for (const a of liste) m.set(cle(a), [...(m.get(cle(a)) ?? []), a]);
    return m;
  };
  const avant = parCle(reference);
  const apres = parCle(refonte);
  const exceptions = exceptionsPour(ecran);

  const enPlus = [...apres.keys()].filter(k => !avant.has(k) && !exceptions.enPlus.includes(k));
  const enMoins = [...avant.keys()].filter(k => !apres.has(k) && !exceptions.enMoins.includes(k));
  expect.soft(enPlus, `${ecran} : appels en plus (non justifiés)`).toEqual([]);
  expect.soft(enMoins, `${ecran} : appels en moins (non justifiés)`).toEqual([]);

  for (const [k, appelsAvant] of avant) {
    const appelsApres = apres.get(k);
    if (!appelsApres) continue;
    const signature = (a: Appel) => JSON.stringify({ parametres: a.parametres, corps: a.corps });
    expect.soft(
      [...new Set(appelsApres.map(signature))].sort(),
      `${ecran} : ${k} — paramètres et clés du corps`,
    ).toEqual([...new Set(appelsAvant.map(signature))].sort());

    if (k.startsWith('GET ') && !exceptions.reponsesDifferentes.includes(k)) {
      const reponses = (l: Appel[]) => [...new Set(l.map(a => `${a.statut} ${a.reponse ?? ''}`))].sort();
      expect.soft(reponses(appelsApres), `${ecran} : ${k} — statut et réponse`).toEqual(reponses(appelsAvant));
    }
  }
}
