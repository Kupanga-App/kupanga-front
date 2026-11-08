import type { Locator, Page } from '@playwright/test';
import { DEMO, type Compte } from '../outils/comptes';
import { contrat, demandeLocation, erreurApi, intercepter, location, simuler } from '../outils/simul';
import { pagePrete } from '../outils/test';

/**
 * Écrans principaux comparés aux maquettes (`../frontend-audit/maquettes/png/`) et figés en instantanés.
 * `preparer` amène l'écran dans l'état de la maquette (réponses simulées si l'état n'existe pas en démo) ;
 * `masques` couvre ce qui ne peut pas être identique : photos, tuiles de carte, dates et compteurs du jour.
 */
export interface Ecran {
  nom: string;
  compte: Compte | null;
  route: string;
  /** Maquette (nom du PNG) et, pour les planches de téléphones, position de l'écran dans la planche. */
  maquette?: { png: string; decoupe?: { x: number; y: number } };
  telephone?: boolean;
  /** Hauteur de la capture sur ordinateur (hauteur du PNG de la maquette). */
  hauteur?: number;
  preparer?: (page: Page) => Promise<void>;
  apres?: (page: Page) => Promise<void>;
  masques?: (page: Page) => Locator[];
  /** Écarts connus avec la maquette (bilans des phases 1 à 5). */
  ecarts?: string;
}

export const JETON_SIMULE = 'jeton-simule-e2e';

/** Photos, cartes, vidéo, avatars photo : jamais identiques à une maquette. */
export const masquesCommuns = (page: Page): Locator[] => [
  page.locator('main img:not([alt="Kupanga"])'),
  page.locator('.leaflet-container'),
  page.locator('iframe, video'),
];

/** Pastilles de compteurs (non-lus, notifications) et dates relatives au jour du test. */
export const masquesDuJour = (page: Page): Locator[] => [
  page.getByRole('link', { name: /^Notifications/ }),
  page.locator('time'),
  // Nom et date du jour sous le trait de signature
  page.locator('kp-signature .mention'),
];

async function sansReservation(page: Page) {
  await simuler(page, 'GET', '/locations/reservations', []);
}

async function assistantBailEtape2(page: Page) {
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByLabel('Loyer hors charges').waitFor();
}

async function assistantEdlPieces(page: Page, ouvrir: 'Cuisine' | null) {
  await page.getByRole('button', { name: 'Continuer' }).click();
  const releves = page.getByLabel('Relevé');
  for (let i = 0; i < (await releves.count()); i++) await releves.nth(i).fill(String(1200 + i));
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  const ajout = page.getByRole('group', { name: 'Ajouter une pièce' });
  // Sur téléphone, une pièce ajoutée s'ouvre en plein écran : retour à la liste avant la suivante
  const retour = page.getByRole('button', { name: 'Liste des pièces' });
  for (const piece of ['Salon', 'Cuisine', 'Chambre', 'Salle de bain']) {
    if (await retour.isVisible()) await retour.click();
    await ajout.getByRole('button', { name: piece }).click();
  }
  if (await retour.isVisible()) await retour.click();
  if (ouvrir !== null) await page.getByRole('button', { name: new RegExp(`^${ouvrir}`) }).first().click();
}

async function signatureOuverte(page: Page) {
  await page.getByLabel('J’ai lu le bail en entier et j’accepte de le signer').check();
  await page.getByRole('button', { name: 'Signer le bail' }).click();
  await page.getByRole('dialog', { name: 'Votre signature' }).waitFor();
}

/** Fenêtre de signature ouverte, une signature tracée (état des maquettes Signer-Bail et Signer-Mobile). */
async function signatureTracee(page: Page) {
  await signatureOuverte(page);
  const cadre = (await page.getByLabel('Zone de signature : dessinez votre signature').boundingBox())!;
  await page.mouse.move(cadre.x + cadre.width * 0.3, cadre.y + cadre.height * 0.6);
  await page.mouse.down();
  for (const [x, y] of [[0.36, 0.35], [0.42, 0.62], [0.48, 0.36], [0.55, 0.6], [0.62, 0.38], [0.7, 0.45]]) {
    await page.mouse.move(cadre.x + cadre.width * x, cadre.y + cadre.height * y, { steps: 4 });
  }
  await page.mouse.up();
}

const BAIL_SIMULE = contrat({ bienId: DEMO.bienLoueClaire, adresseBien: '109 rue Émile Zola, 69001 Lyon',
  locataire: { id: 3, firstName: 'Lucas', lastName: 'Bernard', mail: 'lucas.bernard@kupanga.dev', role: 'ROLE_LOCATAIRE', hasCompleteProfil: true },
  loyerMensuel: 325, chargesMensuelles: 40, depotGarantie: 650, dateDebut: '2026-11-08', dateSignatureProprietaire: '2026-11-06T14:32:00' });

export const ECRANS_ORDINATEUR: Ecran[] = [
  { nom: 'O1v2-Landing', compte: null, route: '/', hauteur: 3880, maquette: { png: 'O1v2-Landing' },
    ecarts: 'Bouton clair / sombre et section vidéo (gardés) ; « Lucas Bernard » ; étape 3 sans « retirée de la recherche » (E8) ; photos d’exemple' },
  { nom: 'O1v2-Explorer', compte: null, route: '/explorer', hauteur: 1356, maquette: { png: 'O1v2-Explorer' },
    masques: p => [p.getByRole('main').locator('h1 + p')],
    ecarts: 'Pas de Favoris ni d’alerte (E4, E5) ; « Type de bien », « Loyer », « Pièces » ouvrent la feuille (F2) ; tri ; annonces réelles' },
  { nom: 'Annonce-France', compte: null, route: `/annonces/${DEMO.bienVacantClaire}`, hauteur: 1918, maquette: { png: 'Annonce-France' },
    ecarts: 'Mention de confidentialité validée ; GES aux couleurs du DPE (F3) ; contenu de l’annonce de démo' },
  { nom: 'Annonce-RDC', compte: null, route: `/annonces/${DEMO.annonceRdc}`, hauteur: 1820, maquette: { png: 'Annonce-RDC' },
    ecarts: 'Contenu de l’annonce de démo' },
  { nom: 'Annonce-Proprio', compte: 'claire', route: `/annonces/${DEMO.bienVacantClaire}`, hauteur: 1998, maquette: { png: 'Annonce-Proprio' },
    ecarts: 'Barre latérale du propriétaire au lieu de la barre publique' },
  { nom: 'Nav-Proprio-Tableau', compte: 'claire', route: '/accueil', hauteur: 1040, maquette: { png: 'Nav-Proprio-Tableau' },
    masques: p => [p.getByRole('heading', { level: 1 }), p.getByRole('region', { name: 'Chiffres du mois' }).getByText(/Échéance/)],
    ecarts: '« Ajouter un bien » olive ; cloche avec nombre ; pas de « Répondre à … » (F1) ; frise à 36 px' },
  { nom: 'Nav-Proprio-Messages', compte: 'claire', route: '/messages', hauteur: 900, maquette: { png: 'Nav-Proprio-Messages' },
    apres: async p => {
      const historique = p.waitForResponse(r => r.url().includes('/historique'));
      await p.getByRole('region', { name: 'Conversations' }).getByRole('button', { name: /Inès Moreau/ }).click();
      await historique;
    },
    ecarts: 'Recherche par bien (E6) ; heure et accusé dans la bulle ; conversation de démo' },
  { nom: 'Nav-Candidat', compte: 'ines', route: '/accueil', hauteur: 940, maquette: { png: 'Nav-Candidat' },
    preparer: async p => { await sansReservation(p); await simuler(p, 'GET', '/demandes-location/recues', [demandeLocation()]); },
    ecarts: 'Pas de Favoris (E4), pas d’« alertes » (E5), pas de « Vous : » (E13) ; onglet Demandes ajouté' },
  { nom: 'Fiche-Bien-Loue', compte: 'claire', route: `/biens/${DEMO.bienLoueClaire}`, hauteur: 1500, maquette: { png: 'Fiche-Bien-Loue' },
    ecarts: 'Frise à 4 étapes visibles ; carte en lecture seule ; « Mettre fin au bail » en bouton' },
  { nom: 'Fiche-Bien-Vacant', compte: 'claire', route: `/biens/${DEMO.bienVacantClaire}`, hauteur: 1300, maquette: { png: 'Fiche-Bien-Vacant' },
    ecarts: 'Pas de « retiré des annonces » (E8) ; libellés de frise' },
  { nom: 'Assist-Bail', compte: 'claire', route: `/biens/${DEMO.bienLoueClaire}/bail/nouveau`, hauteur: 900, maquette: { png: 'Assist-Bail' },
    apres: assistantBailEtape2, masques: p => [p.locator('aside mark').first()],
    ecarts: 'Pas de brouillon ni « Enregistrer et quitter » ; avertissement du dépôt différent (E7) ; aperçu sans texte complet (E2)' },
  { nom: 'Bail-A-Signer', compte: 'patrick', route: `/biens/${DEMO.bienLouePatrick}/bail`, hauteur: 900, maquette: { png: 'Bail-A-Signer' },
    ecarts: 'Titre = titre du bien ; bail de démo en attente de Grâce (RDC) au lieu de Lucas' },
  { nom: 'Assist-EDL', compte: 'claire', route: `/biens/${DEMO.bienLoueClaire}/etats-des-lieux/nouveau`, hauteur: 900, maquette: { png: 'Assist-EDL' },
    apres: p => assistantEdlPieces(p, 'Cuisine'),
    ecarts: 'Bloc photos absent (E1) ; pas de « vérifiée » ni d’icônes de pièce' },
  { nom: 'Mon-Logement', compte: 'grace', route: '/mon-logement', hauteur: 1500, maquette: { png: 'Mon-Logement' },
    ecarts: 'Logement de démo (RDC, bail à signer) ; WhatsApp en lien wa.me ; pas de « Modifier »' },
  { nom: 'Mon-Logement-Quittances', compte: 'lucas', route: '/quittances', hauteur: 900, maquette: { png: 'Mon-Logement-Quittances' },
    ecarts: 'Badges « En attente » / « Loyer reçu » ; colonne Détail' },
  { nom: 'Mon-Logement-Reserve', compte: 'ines', route: '/mon-logement', hauteur: 820, maquette: { png: 'Mon-Logement-Reserve' },
    preparer: async p => { await simuler(p, 'GET', '/locations/reservations', [location()]); },
    masques: p => [p.getByText(/Réservé jusqu’au/)],
    ecarts: 'Icône au lieu de la photo, adresse au lieu du loyer, pas de « Message à Claire M. » (E10, E8)' },
  { nom: 'Signer-Bail', compte: null, route: `/contrats/signer/${JETON_SIMULE}`, hauteur: 1204, maquette: { png: 'Signer-Bail' },
    preparer: async p => { await simuler(p, 'GET', `/contrats/signer/${JETON_SIMULE}`, BAIL_SIMULE); },
    apres: signatureTracee,
    ecarts: 'Titre = adresse (E11) ; aperçu sans texte complet (E2) ; « Signé par … le … » (E3) ; cadre de signature blanc' },
  { nom: 'Signer-Lien-Invalide', compte: null, route: `/contrats/signer/${JETON_SIMULE}`, hauteur: 640, maquette: { png: 'Signer-Lien-Invalide' },
    preparer: async p => { await simuler(p, 'GET', `/contrats/signer/${JETON_SIMULE}`, erreurApi(410, 'Ce lien de signature a expiré. Demandez au propriétaire de vous en renvoyer un.'), 410); },
    ecarts: 'Planche à deux cartes (410 et 404) ; l’écran en montre une ; icônes Lucide sur aplat' },
];

export const ECRANS_TELEPHONE: Ecran[] = [
  { nom: 'Nav-Mobile-Proprietaire', compte: 'claire', route: '/accueil', telephone: true, maquette: { png: 'Nav-Mobile', decoupe: { x: 75, y: 83 } },
    masques: p => [p.getByRole('heading', { level: 1 })], ecarts: 'Contenu de l’accueil (phases 3 à 5)' },
  { nom: 'Nav-Mobile-Locataire', compte: 'grace', route: '/mon-logement', telephone: true, maquette: { png: 'Nav-Mobile', decoupe: { x: 505, y: 83 } },
    ecarts: 'Arrivée sur Mon logement (planche Nav-Locataire retirée)' },
  { nom: 'Nav-Mobile-Candidat', compte: 'ines', route: '/accueil', telephone: true, maquette: { png: 'Nav-Mobile', decoupe: { x: 935, y: 83 } },
    preparer: async p => { await sansReservation(p); await simuler(p, 'GET', '/demandes-location/recues', [demandeLocation()]); },
    ecarts: 'Pas de Favoris (E4) ; onglet Demandes' },
  { nom: 'Assist-EDL-Mobile-Liste', compte: 'claire', route: `/biens/${DEMO.bienLoueClaire}/etats-des-lieux/nouveau`, telephone: true,
    maquette: { png: 'Assist-EDL-Mobile', decoupe: { x: 86, y: 66 } }, apres: p => assistantEdlPieces(p, null), ecarts: 'Pas de « vérifiée »' },
  { nom: 'Assist-EDL-Mobile-Piece', compte: 'claire', route: `/biens/${DEMO.bienLoueClaire}/etats-des-lieux/nouveau`, telephone: true,
    maquette: { png: 'Assist-EDL-Mobile', decoupe: { x: 524, y: 66 } }, apres: p => assistantEdlPieces(p, 'Cuisine'), ecarts: 'Bloc photos absent (E1)' },
  { nom: 'Signer-Mobile-Relire', compte: null, route: `/contrats/signer/${JETON_SIMULE}`, telephone: true,
    maquette: { png: 'Signer-Mobile', decoupe: { x: 75, y: 66 } },
    preparer: async p => { await simuler(p, 'GET', `/contrats/signer/${JETON_SIMULE}`, BAIL_SIMULE); }, ecarts: 'Titre = adresse (E11)' },
  { nom: 'Signer-Mobile-Signer', compte: null, route: `/contrats/signer/${JETON_SIMULE}`, telephone: true,
    maquette: { png: 'Signer-Mobile', decoupe: { x: 505, y: 66 } },
    preparer: async p => { await simuler(p, 'GET', `/contrats/signer/${JETON_SIMULE}`, BAIL_SIMULE); }, apres: signatureTracee,
    ecarts: 'Cadre de signature blanc' },
  { nom: 'Signer-Mobile-Confirmation', compte: null, route: `/contrats/signer/${JETON_SIMULE}`, telephone: true,
    maquette: { png: 'Signer-Mobile', decoupe: { x: 935, y: 66 } },
    preparer: async p => {
      await simuler(p, 'GET', `/contrats/signer/${JETON_SIMULE}`, BAIL_SIMULE);
      await intercepter(p, 'POST', `/contrats/signer/${JETON_SIMULE}`);
    },
    apres: async p => {
      await signatureTracee(p);
      await p.getByRole('button', { name: 'Valider ma signature' }).click();
      await p.getByRole('heading', { name: 'Bail signé' }).waitFor();
    },
    ecarts: 'Pas de « Télécharger le PDF » (E12)' },
];

/** Charge l'écran dans l'état voulu, attend le réseau et les polices. */
export async function afficher(page: Page, ecran: Ecran): Promise<void> {
  await ecran.preparer?.(page);
  await page.goto(ecran.route);
  await pagePrete(page, 20_000);
  await ecran.apres?.(page);
  await pagePrete(page, 10_000);
  // Retire le curseur et le focus pour des captures stables
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

export function masques(page: Page, ecran: Ecran): Locator[] {
  return [...masquesCommuns(page), ...masquesDuJour(page), ...(ecran.masques?.(page) ?? [])];
}
