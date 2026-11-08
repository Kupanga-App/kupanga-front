import { EtapeFrise, EtatEtape } from '../../shared/ui/frise.component';

export type CleEtapeLocataire = 'demande' | 'bail' | 'signature' | 'edl' | 'quittances';

export interface EtapeLocataire extends EtapeFrise {
  cle: CleEtapeLocataire;
}

export interface EtapesLocataire {
  etapes: EtapeLocataire[];
  /** Rang (0 à 4) de la première étape non terminée ; `etapes.length` si tout est fait. */
  courante: number;
}

/** Bail vu par le locataire (`POST /contrats/search` ou tableau de bord) : seuls l'id et le statut comptent. */
export interface BailLocataire {
  id: number;
  statut: string;
  proprietaireASigné?: boolean | null;
}

/** État des lieux du tableau de bord du locataire. */
export interface EdlLocataire {
  type: 'ENTREE' | 'SORTIE';
  statut: string;
}

/**
 * Données déjà chargées par « Mon logement » (tableau de bord, bail, notifications), ou par la réservation
 * (`GET /locations/reservations`) quand le logement n'est encore que réservé.
 */
export interface DonneesEtapesLocataire {
  /** Logement seulement réservé : pas encore de bail visible. */
  reserve: boolean;
  /** « Claire M. » */
  proprietaire: string;
  /** Baux du logement qui concernent le compte (peut être vide, hors ligne par exemple). */
  baux: readonly BailLocataire[];
  /** Bail signé du tableau de bord (`GET /locataire/dashboard/{bienId}` ne renvoie que celui-là). */
  bailSigne: { id: number } | null;
  /** Ids des baux pour lesquels une invitation à signer est arrivée (notifications non lues). */
  invitationsBail: readonly number[];
  etatsDesLieux: readonly EdlLocataire[];
  nombreQuittances: number;
}

/** Bail le plus récent qui n'est pas annulé (id décroissant : un bail recréé remplace le précédent). */
export function bailCourant(baux: readonly BailLocataire[]): BailLocataire | null {
  return [...baux].filter(b => b.statut !== 'ANNULE').sort((a, b) => b.id - a.id)[0] ?? null;
}

/**
 * Où en est la location, vue du locataire : Demande acceptée → Bail créé → Votre signature → État des lieux →
 * Quittances. Fonction pure, sans appel. Le tableau de bord ne renvoie que le bail signé : un bail en attente du
 * locataire se lit dans les baux du logement, à défaut dans une invitation à signer reçue.
 */
export function calculerEtapesLocataire(d: DonneesEtapesLocataire): EtapesLocataire {
  const prenomProprio = d.proprietaire.split(' ')[0] || 'le propriétaire';
  const proprio = d.proprietaire || 'le propriétaire';
  const bail = d.reserve ? null : bailCourant(d.baux);
  const signe = !d.reserve && (!!d.bailSigne || bail?.statut === 'SIGNE');
  const invite = !d.reserve && d.invitationsBail.some(id => id !== d.bailSigne?.id);
  const bailEnvoye = signe || invite
    || (!!bail && ['EN_ATTENTE_SIGNATURE_LOCATAIRE', 'EXPIRE', 'SIGNE'].includes(bail.statut));

  const entrees = d.reserve ? [] : d.etatsDesLieux.filter(e => e.type === 'ENTREE');
  const entree = entrees.find(e => e.statut === 'SIGNE') ?? entrees[0] ?? null;

  const faits: Record<CleEtapeLocataire, boolean> = {
    demande: true,
    bail: bailEnvoye,
    signature: signe,
    edl: entree?.statut === 'SIGNE',
    quittances: !d.reserve && d.nombreQuittances > 0,
  };

  const details: Record<CleEtapeLocataire, string> = {
    demande: signe ? 'Terminé' : 'Réservé pour vous',
    bail: bailEnvoye
      ? (bail?.proprietaireASigné || signe || invite ? `Signé par ${proprio}` : 'Créé')
      : `Préparé par ${proprio}`,
    signature: signe ? 'Signé' : bail?.statut === 'EXPIRE' ? 'Lien expiré' : bailEnvoye ? 'À faire' : 'Par lien',
    edl: detailEdl(entree?.statut ?? null, prenomProprio, proprio),
    quittances: d.nombreQuittances > 0 && !d.reserve
      ? `${d.nombreQuittances} quittance${d.nombreQuittances > 1 ? 's' : ''}`
      : 'Chaque mois',
  };

  const ordre: { cle: CleEtapeLocataire; libelle: string; icone: string }[] = [
    { cle: 'demande', libelle: 'Demande acceptée', icone: 'key' },
    { cle: 'bail', libelle: 'Bail créé', icone: 'file-text' },
    { cle: 'signature', libelle: 'Votre signature', icone: 'signature' },
    { cle: 'edl', libelle: 'État des lieux', icone: 'clipboard-check' },
    { cle: 'quittances', libelle: 'Quittances', icone: 'receipt' },
  ];

  // Une seule étape « en cours » : une étape n'est terminée que si les précédentes le sont
  let courante = ordre.findIndex(e => !faits[e.cle]);
  if (courante < 0) courante = ordre.length;
  const etapes: EtapeLocataire[] = ordre.map((e, i) => {
    const etat: EtatEtape = i < courante ? 'fait' : i === courante ? 'en-cours' : 'a-venir';
    // Bail pas encore créé : la maquette dit « Bail », pas « Bail créé »
    const libelle = e.cle === 'bail' && !faits.bail ? 'Bail' : e.libelle;
    return { cle: e.cle, libelle, detail: details[e.cle], etat, icone: e.icone };
  });
  return { etapes, courante };
}

function detailEdl(statut: string | null, prenomProprio: string, proprio: string): string {
  switch (statut) {
    case 'SIGNE': return 'Signé';
    case 'EN_ATTENTE_SIGNATURE_LOCATAIRE': return 'À signer';
    case 'EXPIRE': return 'Lien expiré';
    case 'BROUILLON':
    case 'EN_ATTENTE_SIGNATURE_PROPRIO': return `En attente de ${proprio}`;
    default: return `Entrée, avec ${prenomProprio}`;
  }
}
