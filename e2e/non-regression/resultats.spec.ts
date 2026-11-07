import fs from 'node:fs';
import path from 'node:path';
import type { Compte } from '../outils/comptes';
import { expect, pagePrete, test } from '../outils/test';
import { CIBLE, servirReference } from './cible';

/**
 * Mêmes résultats affichés : sur quelques écrans clés, les valeurs métier (montants, dates, statuts) lues dans le
 * texte de la page, indépendamment de la mise en page. Toute valeur affichée par la branche d'origine doit se
 * retrouver dans la refonte (qui peut en montrer davantage : chiffres de l'accueil, frise…).
 */

const ECRANS: { compte: Compte | null; route: string }[] = [
  { compte: 'claire', route: '/accueil' },
  { compte: 'claire', route: '/biens/1/quittances' },
  { compte: 'patrick', route: '/biens/141/quittances' },
  { compte: 'lucas', route: '/mon-logement' },
  { compte: 'lucas', route: '/quittances' },
  { compte: null, route: '/annonces/2' },
  { compte: null, route: '/annonces/142' },
];

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURTS: Record<string, number> = {
  janv: 1, févr: 2, fév: 2, mars: 3, avr: 4, mai: 5, juin: 6, juil: 7, août: 8, sept: 9, oct: 10, nov: 11, déc: 12,
};
const STATUTS = ['Loué', 'Vacant', 'Réservé', 'En attente', 'Loyer reçu', 'Signé', 'En retard', 'Impayée', 'À signer', 'Archivé'];

export interface Valeurs {
  montants: string[];
  dates: string[];
  statuts: string[];
}

/** « 1 860 $US », « 365,00 € », « 1 175 000 CDF » → « 1860 USD », « 365 EUR »… */
function montants(texte: string): string[] {
  const devises: Record<string, string> = { '€': 'EUR', '$US': 'USD', 'USD': 'USD', 'CDF': 'CDF', 'FC': 'CDF' };
  const sortie = new Set<string>();
  for (const m of texte.matchAll(/(?<![\d,])(\d{1,3}(?:[   ]\d{3})*(?:,\d{2})?)[   ]?(€|\$US|USD|CDF|FC)/g)) {
    const n = Number(m[1].replace(/[\s  ]/g, '').replace(',', '.'));
    sortie.add(`${n} ${devises[m[2]]}`);
  }
  return [...sortie].sort();
}

/** « 5 décembre 2026 », « 5 déc. », « 5 décembre » → « 5/12 » (l'année n'est pas toujours écrite). */
function dates(texte: string): string[] {
  const sortie = new Set<string>();
  for (const m of texte.matchAll(/\b(\d{1,2})(?:er)?\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|janv|févr|fév|avr|juil|sept|oct|nov|déc)\.?/gi)) {
    const nom = m[2].toLowerCase();
    const mois = MOIS.indexOf(nom) + 1 || MOIS_COURTS[nom];
    sortie.add(`${Number(m[1])}/${mois}`);
  }
  return [...sortie].sort();
}

function statuts(texte: string): string[] {
  return STATUTS.filter(s => new RegExp(`(^|[^\\p{L}])${s}([^\\p{L}]|$)`, 'u').test(texte)).sort();
}

export function valeurs(texte: string): Valeurs {
  return { montants: montants(texte), dates: dates(texte), statuts: statuts(texte) };
}

const FICHIER = path.join(__dirname, 'reference-valeurs.json');
const releves: Record<string, Valeurs> = {};
const cleDe = (e: { compte: Compte | null; route: string }) => `${e.compte ?? 'visiteur'} ${e.route}`;

test.describe.configure({ mode: CIBLE === 'reference' ? 'serial' : 'parallel' });

for (const ecran of ECRANS) {
  test.describe(cleDe(ecran), () => {
    test.use({ compte: ecran.compte });

    test(`valeurs affichées : ${cleDe(ecran)}`, async ({ page, context }) => {
      if (CIBLE === 'reference') await servirReference(context);
      await page.goto(ecran.route);
      await pagePrete(page, 20_000);
      await page.waitForTimeout(1_000);
      // Tous ces écrans affichent au moins un montant : on attend les données avant de lire
      const lire = async () => valeurs(await page.locator('main').first().innerText());
      await expect.poll(async () => (await lire()).montants.length, { timeout: 30_000 }).toBeGreaterThan(0);
      await pagePrete(page, 10_000);
      const lues = await lire();

      if (CIBLE === 'reference') {
        releves[cleDe(ecran)] = lues;
        return;
      }
      test.skip(!fs.existsSync(FICHIER), 'reference-valeurs.json absent : enregistrer d’abord la référence');
      const avant = (JSON.parse(fs.readFileSync(FICHIER, 'utf8')) as Record<string, Valeurs>)[cleDe(ecran)];
      expect(avant, `écran absent de reference-valeurs.json : ${cleDe(ecran)}`).toBeDefined();
      for (const sorte of ['montants', 'dates', 'statuts'] as const) {
        const manquantes = avant[sorte].filter(v => !lues[sorte].includes(v));
        expect.soft(manquantes, `${cleDe(ecran)} : ${sorte} affichés avant la refonte et absents après`).toEqual([]);
      }
      test.info().annotations.push({
        type: 'valeurs',
        description: JSON.stringify({ avant, apres: lues }),
      });
    });
  });
}

test.afterAll(async () => {
  if (CIBLE !== 'reference' || !Object.keys(releves).length) return;
  const trie = Object.fromEntries(Object.entries(releves).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(FICHIER, JSON.stringify(trie, null, 2) + '\n');
});
