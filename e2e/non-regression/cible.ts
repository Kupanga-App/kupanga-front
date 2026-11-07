import fs from 'node:fs';
import path from 'node:path';
import type { BrowserContext } from '@playwright/test';

/**
 * Version du front observée : `refonte` (par défaut, `ng serve` sur le port 4200) ou `reference`
 * (KP_CIBLE=reference : la branche d'origine `feature/pret-pour-la-prod`, construite dans un worktree).
 *
 * L'API n'accepte que l'origine http://localhost:4200 (CORS). Plutôt que d'arrêter le serveur de la refonte, la
 * référence est servie par Playwright sous cette même origine, depuis son build de développement
 * (`ng build --configuration development` dans le worktree) : l'API voit la même origine, rien n'est modifié.
 */
export type Cible = 'refonte' | 'reference';
export const CIBLE: Cible = process.env['KP_CIBLE'] === 'reference' ? 'reference' : 'refonte';

export const DOSSIER_REFERENCE = path.resolve(
  process.env['KP_REFERENCE_DIST'] ?? path.join(__dirname, '..', '..', '..', 'kupanga-front-reference', 'dist', 'kupanga-front', 'browser'),
);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.map': 'application/json', '.txt': 'text/plain',
};

/** Sert la référence à la place de `ng serve` pour toutes les requêtes vers http://localhost:4200. */
export async function servirReference(context: BrowserContext): Promise<void> {
  if (!fs.existsSync(path.join(DOSSIER_REFERENCE, 'index.html'))) {
    throw new Error(`Build de la référence introuvable : ${DOSSIER_REFERENCE} (voir e2e/README.md, « Non-régression »).`);
  }
  await context.route(/^http:\/\/localhost:4200\//, async route => {
    const chemin = decodeURIComponent(new URL(route.request().url()).pathname);
    let fichier = path.join(DOSSIER_REFERENCE, chemin);
    if (!fichier.startsWith(DOSSIER_REFERENCE) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
      // Application monopage : toute adresse sans fichier rend index.html
      if (path.extname(chemin)) return route.fulfill({ status: 404, body: '' });
      fichier = path.join(DOSSIER_REFERENCE, 'index.html');
    }
    await route.fulfill({
      status: 200,
      contentType: TYPES[path.extname(fichier).toLowerCase()] ?? 'application/octet-stream',
      body: fs.readFileSync(fichier),
    });
  });
}
