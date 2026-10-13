import { BienDTO } from '../../biens/models/bien.model';
import { ContratDTO } from '../../gestion-logement/models/contrat.model';
import { EtatDesLieuxDTO } from '../../gestion-logement/models/edl.model';
import { QuittanceDTO } from '../../gestion-logement/models/quittance.model';
import { de, joursAvant, moisAnnee } from '../../../shared/format';

export type Urgence = 'urgent' | 'attention' | 'info';

/** Une chose à faire aujourd'hui, avec l'écran où la faire. */
export interface Tache {
  cle: string;
  urgence: Urgence;
  titre: string;
  detail: string;
  action: string;
  lien: unknown[];
  icone: string;
}

export interface DonneesAccueil {
  biens: BienDTO[];
  contrats: ContratDTO[];
  /** États des lieux par bien (l'API ne renvoie pas l'identifiant du bien dans l'état des lieux). */
  edlsParBien: Map<number, EtatDesLieuxDTO[]>;
  quittances: QuittanceDTO[];
  messagesNonLus: number;
}

const ORDRE: Record<Urgence, number> = { urgent: 0, attention: 1, info: 2 };

/**
 * Tâches de l'accueil du propriétaire, de la plus urgente à la moins urgente (AUDIT.md §8.4) :
 * documents à signer, loyers en retard ou attendus, bail ou état des lieux d'entrée manquant, messages non lus.
 */
export function calculerTaches(d: DonneesAccueil): Tache[] {
  const taches: Tache[] = [];
  const actifs = d.biens.filter(b => !b.archive);
  const titre = (bienId: number | undefined) => d.biens.find(b => b.id === bienId)?.titre ?? 'votre bien';

  // Bail le plus récent de chaque bien (l'API trie par date de début décroissante)
  const bailParBien = new Map<number, ContratDTO>();
  for (const c of d.contrats) {
    if (!bailParBien.has(c.bienId)) bailParBien.set(c.bienId, c);
  }

  for (const b of actifs) {
    const bail = bailParBien.get(b.id);
    const edls = d.edlsParBien.get(b.id) ?? [];

    if (bail?.statut === 'EN_ATTENTE_SIGNATURE_PROPRIO') {
      taches.push({
        cle: `bail-${bail.id}`, urgence: 'urgent', icone: 'pen-line',
        titre: 'Bail à signer', detail: b.titre, action: 'Signer', lien: ['/biens', b.id, 'bail'],
      });
    } else if (bail?.statut === 'EXPIRE') {
      taches.push({
        cle: `bail-${bail.id}`, urgence: 'attention', icone: 'clock',
        titre: 'Lien de signature du bail expiré', detail: b.titre, action: 'Renvoyer', lien: ['/biens', b.id, 'bail'],
      });
    } else if (bail?.statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE') {
      taches.push({
        cle: `bail-${bail.id}`, urgence: 'info', icone: 'clock',
        titre: 'Bail en attente du locataire', detail: b.titre, action: 'Voir', lien: ['/biens', b.id, 'bail'],
      });
    } else if (b.locataire && (!bail || bail.statut === 'ANNULE')) {
      taches.push({
        cle: `sans-bail-${b.id}`, urgence: 'attention', icone: 'file-text',
        titre: 'Bail à créer', detail: b.titre, action: 'Créer le bail', lien: ['/biens', b.id, 'bail', 'nouveau'],
      });
    }

    for (const e of edls) {
      if (e.statut === 'EN_ATTENTE_SIGNATURE_PROPRIO') {
        taches.push({
          cle: `edl-${e.id}`, urgence: 'urgent', icone: 'pen-line',
          titre: 'État des lieux à signer', detail: b.titre, action: 'Signer', lien: ['/biens', b.id, 'etats-des-lieux'],
        });
      } else if (e.statut === 'EXPIRE') {
        taches.push({
          cle: `edl-${e.id}`, urgence: 'attention', icone: 'clock',
          titre: 'Lien de signature de l’état des lieux expiré', detail: b.titre, action: 'Renvoyer',
          lien: ['/biens', b.id, 'etats-des-lieux'],
        });
      }
    }

    if (b.locataire && bail?.statut === 'SIGNE' && !edls.some(e => e.type === 'ENTREE')) {
      taches.push({
        cle: `edl-entree-${b.id}`, urgence: 'attention', icone: 'clipboard-check',
        titre: 'État des lieux d’entrée à faire', detail: b.titre, action: 'Commencer',
        lien: ['/biens', b.id, 'etats-des-lieux', 'nouveau'],
      });
    }
  }

  for (const q of d.quittances) {
    if (!q.bienId || !actifs.some(b => b.id === q.bienId)) continue;
    const mois = moisAnnee(q.mois, q.annee);
    if (q.statut === 'EN_RETARD' || q.statut === 'IMPAYEE') {
      taches.push({
        cle: `q-${q.id}`, urgence: 'urgent', icone: 'receipt',
        titre: `Loyer ${de(mois)} en retard`, detail: titre(q.bienId), action: 'Déclarer reçu',
        lien: ['/biens', q.bienId, 'quittances'],
      });
    } else if (q.statut === 'EN_ATTENTE') {
      const j = joursAvant(q.dateEcheance);
      if (j !== null && j <= 7) {
        taches.push({
          cle: `q-${q.id}`, urgence: j < 0 ? 'urgent' : 'attention', icone: 'receipt',
          titre: j < 0 ? `Loyer ${de(mois)} non déclaré reçu` : `Loyer ${de(mois)} attendu`,
          detail: titre(q.bienId), action: 'Déclarer reçu', lien: ['/biens', q.bienId, 'quittances'],
        });
      }
    }
  }

  if (d.messagesNonLus > 0) {
    taches.push({
      cle: 'messages', urgence: 'info', icone: 'message-circle',
      titre: d.messagesNonLus > 1 ? `${d.messagesNonLus} messages non lus` : '1 message non lu',
      detail: 'Messages', action: 'Lire', lien: ['/messages'],
    });
  }

  return taches.sort((a, b) => ORDRE[a.urgence] - ORDRE[b.urgence]);
}
