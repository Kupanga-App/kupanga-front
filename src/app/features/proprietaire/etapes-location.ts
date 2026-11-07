import { BienDTO, locataireDuBail } from '../biens/models/bien.model';
import { ContratDTO } from '../gestion-logement/models/contrat.model';
import { EtatDesLieuxDTO } from '../gestion-logement/models/edl.model';
import { QuittanceDTO } from '../gestion-logement/models/quittance.model';
import { EtapeFrise, EtatEtape } from '../../shared/ui/frise.component';

export type CleEtape = 'annonce' | 'reservation' | 'bail' | 'edl' | 'quittances';

export interface EtapeLocation extends EtapeFrise {
  cle: CleEtape;
}

/** Ce qu'il faut faire maintenant, et où le faire. */
export interface ProchaineEtape {
  cle: CleEtape;
  titre: string;
  texte: string;
  action: string;
  lien: unknown[];
}

export interface EtapesLocation {
  etapes: EtapeLocation[];
  /** Rang (0 à 4) de la première étape non terminée ; `etapes.length` si tout est fait. */
  courante: number;
  /** Null pour un bien archivé ou quand il n'y a rien à faire depuis la fiche. */
  prochaine: ProchaineEtape | null;
}

/** Données déjà chargées pour un bien (fiche du bien ou `DonneesProprietaireService`). */
export interface DonneesLocation {
  bien: BienDTO;
  contrats: readonly ContratDTO[];
  edls: readonly EtatDesLieuxDTO[];
  quittances: readonly QuittanceDTO[];
}

/** Même personne, quand le document dit pour qui il est (sinon on ne peut pas trancher : on le garde). */
function memePersonne(mail: string | null | undefined, attendu: string | null | undefined): boolean {
  return !mail || !attendu || mail.toLowerCase() === attendu.toLowerCase();
}

/**
 * Bail le plus récent : date de début puis identifiant décroissants. L'API trie déjà par date de début, mais deux
 * baux recréés le même jour gardent un ordre indéterminé ; le tri est refait ici plutôt que de prendre `[0]`.
 */
export function bailLePlusRecent(contrats: readonly ContratDTO[]): ContratDTO | null {
  return [...contrats].sort((a, b) =>
    (b.dateDebut ?? '').localeCompare(a.dateDebut ?? '') || b.id - a.id)[0] ?? null;
}

/**
 * Où en est la location d'un bien : Annonce → Réservation → Bail → État des lieux → Quittances.
 * Fonction pure, sans appel : seuls `reservation`, `locataire`, les baux, les états des lieux et les quittances déjà
 * chargés sont lus. Les documents d'un locataire précédent (autre e-mail) sont ignorés.
 */
export function calculerEtapesLocation({ bien, contrats, edls, quittances }: DonneesLocation): EtapesLocation {
  const personne = locataireDuBail(bien);
  const prenom = personne?.firstName ?? 'le locataire';
  const mail = personne?.mail;
  const id = bien.id;

  // Sans locataire ni réservation, les documents passés ne disent rien de la location à venir
  const bail = personne ? bailLePlusRecent(contrats.filter(c => memePersonne(c.locataire?.mail, mail))) : null;
  const bailActif = bail && bail.statut !== 'ANNULE' ? bail : null;
  const edlsDuLocataire = personne ? edls.filter(e => memePersonne(e.emailLocataire, mail)) : [];
  const entree = edlsDuLocataire.find(e => e.type === 'ENTREE' && e.statut === 'SIGNE')
    ?? edlsDuLocataire.find(e => e.type === 'ENTREE') ?? null;
  const quittancesDuLocataire = personne ? quittances.filter(q => memePersonne(q.emailLocataire, mail)) : [];

  const faits: Record<CleEtape, boolean> = {
    annonce: !bien.archive || !!personne,
    reservation: !!personne,
    bail: bailActif?.statut === 'SIGNE',
    edl: entree?.statut === 'SIGNE',
    quittances: false,
  };

  const details: Record<CleEtape, string> = {
    annonce: personne ? 'Terminé' : bien.archive ? 'Bien archivé' : 'Visible dans Explorer',
    reservation: bien.locataire ? `${bien.locataire.firstName} ${bien.locataire.lastName}`
      : bien.reservation ? `${prenom} a accepté` : 'À choisir',
    bail: !personne ? 'Après la réservation' : detailBail(bailActif, prenom),
    edl: !entree ? 'Entrée, après le bail' : detailSignature(entree.statut, prenom),
    quittances: quittancesDuLocataire.length
      ? `${quittancesDuLocataire.length} quittance${quittancesDuLocataire.length > 1 ? 's' : ''}`
      : 'Chaque mois',
  };

  const ordre: { cle: CleEtape; libelle: string; icone: string }[] = [
    { cle: 'annonce', libelle: 'Annonce', icone: 'megaphone' },
    { cle: 'reservation', libelle: 'Réservation', icone: 'key' },
    { cle: 'bail', libelle: 'Bail', icone: 'file-text' },
    { cle: 'edl', libelle: 'État des lieux', icone: 'clipboard-check' },
    { cle: 'quittances', libelle: 'Quittances', icone: 'receipt' },
  ];

  // Une étape n'est terminée que si toutes les précédentes le sont : une seule étape « en cours »
  let courante = ordre.findIndex(e => !faits[e.cle]);
  if (courante < 0) courante = ordre.length;
  const etapes: EtapeLocation[] = ordre.map((e, i) => {
    const etat: EtatEtape = i < courante ? 'fait' : i === courante ? 'en-cours' : 'a-venir';
    return { cle: e.cle, libelle: e.libelle, detail: details[e.cle], etat, icone: e.icone };
  });

  return { etapes, courante, prochaine: bien.archive ? null : prochaineEtape(ordre[courante]?.cle) };

  function prochaineEtape(cle: CleEtape | undefined): ProchaineEtape | null {
    switch (cle) {
      case 'reservation':
        return {
          cle, titre: 'Choisissez votre locataire', action: 'Proposer la location', lien: ['/biens', id, 'locataire'],
          texte: 'Proposez la location à une personne qui vous a écrit au sujet de ce bien.',
        };
      case 'bail':
        switch (bailActif?.statut) {
          case 'BROUILLON':
          case 'EN_ATTENTE_SIGNATURE_PROPRIO':
            return {
              cle, titre: 'Signer le bail', action: 'Signer le bail', lien: ['/biens', id, 'bail'],
              texte: `Relisez-le, puis signez : ${prenom} recevra ensuite un lien pour signer à son tour.`,
            };
          case 'EN_ATTENTE_SIGNATURE_LOCATAIRE':
            return {
              cle, titre: `Bail en attente de ${prenom}`, action: 'Voir le bail', lien: ['/biens', id, 'bail'],
              texte: `${prenom} a reçu un lien par e-mail pour signer.`,
            };
          case 'EXPIRE':
            return {
              cle, titre: 'Lien de signature expiré', action: 'Renvoyer le lien', lien: ['/biens', id, 'bail'],
              texte: `Le lien envoyé à ${prenom} n’est plus valable : signez de nouveau pour en renvoyer un.`,
            };
          default:
            return {
              cle, titre: `Créer le bail de ${personne ? `${personne.firstName} ${personne.lastName}` : 'votre locataire'}`,
              action: 'Créer le bail', lien: ['/biens', id, 'bail', 'nouveau'],
              texte: `Vous le signerez, puis ${prenom} recevra un lien pour signer à son tour.`,
            };
        }
      case 'edl':
        if (!entree) {
          // L'assistant demande un locataire en titre (signature du bail faite)
          return bien.locataire ? {
            cle, titre: 'Faire l’état des lieux d’entrée', action: 'Commencer', lien: ['/biens', id, 'etats-des-lieux', 'nouveau'],
            texte: `Pièce par pièce, avec ${prenom}. Vous le signerez, puis ${prenom} recevra un lien.`,
          } : null;
        }
        return entree.statut === 'EN_ATTENTE_SIGNATURE_PROPRIO' || entree.statut === 'BROUILLON'
          ? {
            cle, titre: 'Signer l’état des lieux d’entrée', action: 'Signer', lien: ['/biens', id, 'etats-des-lieux'],
            texte: `${prenom} recevra ensuite un lien pour signer à son tour.`,
          }
          : {
            cle, titre: 'État des lieux en attente', action: 'Voir', lien: ['/biens', id, 'etats-des-lieux'],
            texte: detailSignature(entree.statut, prenom) + '.',
          };
      case 'quittances':
        return quittancesDuLocataire.length
          ? {
            cle, titre: 'Suivre les loyers', action: 'Voir les quittances', lien: ['/biens', id, 'quittances'],
            texte: 'Déclarez chaque loyer reçu : la quittance part au locataire.',
          }
          : {
            cle, titre: 'Créer la première quittance', action: 'Créer la quittance', lien: ['/biens', id, 'quittances', 'nouvelle'],
            texte: 'Vous déclarerez le loyer reçu quand il sera payé.',
          };
      default:
        return null;
    }
  }
}

function detailBail(bail: ContratDTO | null, prenom: string): string {
  return bail ? detailSignature(bail.statut, prenom) : 'À créer';
}

function detailSignature(statut: string, prenom: string): string {
  switch (statut) {
    case 'SIGNE': return 'Signé';
    case 'BROUILLON':
    case 'EN_ATTENTE_SIGNATURE_PROPRIO': return 'À signer';
    case 'EN_ATTENTE_SIGNATURE_LOCATAIRE': return `En attente de ${prenom}`;
    case 'EXPIRE': return 'Lien expiré';
    default: return 'À créer';
  }
}
