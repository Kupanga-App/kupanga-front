/**
 * Attend que l'API locale réponde « UP » : Spring Boot peut mettre du temps à répondre au premier appel.
 * Échoue avec un message clair si l'API n'est pas lancée (voir ../kupanga-Api/GUIDE-DEMARRAGE.md).
 */
export const API = 'http://localhost:8089';

export default async function globalSetup(): Promise<void> {
  const limite = Date.now() + 120_000;
  let dernier = '';
  while (Date.now() < limite) {
    try {
      const reponse = await fetch(`${API}/actuator/health`);
      const corps = (await reponse.json()) as { status?: string };
      if (corps.status === 'UP') return;
      dernier = `statut ${corps.status}`;
    } catch (e) {
      dernier = (e as Error).message;
    }
    await new Promise(r => setTimeout(r, 2_000));
  }
  throw new Error(
    `L'API ${API} ne répond pas « UP » (${dernier}). ` +
      'Lancez-la : docker compose -f docker-compose-dev.yml up -d (dans ../kupanga-Api).',
  );
}
