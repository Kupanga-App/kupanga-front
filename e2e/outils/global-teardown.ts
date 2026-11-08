import fs from 'node:fs';
import path from 'node:path';

/**
 * Fin d'exécution : assemble le tableau de conformité aux maquettes (projet `conformite`) à partir des résultats
 * écrits écran par écran dans e2e/visuel/conformite/resultats/.
 */
export default async function globalTeardown(): Promise<void> {
  const dossier = path.join(__dirname, '..', 'visuel', 'conformite');
  const resultats = path.join(dossier, 'resultats');
  if (!fs.existsSync(resultats)) return;
  const lignes = fs.readdirSync(resultats)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(resultats, f), 'utf8')) as {
      nom: string; maquette: string; ratio: number; seuil: number; ecarts: string; difference: string;
    })
    .sort((a, b) => a.nom.localeCompare(b.nom));
  if (!lignes.length) return;
  const seuil = lignes[0].seuil;
  const tableau = [
    `# Conformité aux maquettes (${new Date().toLocaleString('fr-FR')})`,
    '',
    `Seuil : ${seuil * 100} % de pixels différents (écart de couleur > 30 %). Photos, cartes, dates et compteurs masqués.`,
    '',
    '| Écran | Maquette | Pixels différents | Image de différence | Écarts connus |',
    '| --- | --- | --- | --- | --- |',
    ...lignes.map(r => `| ${r.nom} | ${r.maquette} | ${(r.ratio * 100).toFixed(1)} %${r.ratio > seuil ? ' (au-delà du seuil)' : ''} | [${r.difference}](${r.difference}) | ${r.ecarts} |`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dossier, 'tableau.md'), tableau);
}
