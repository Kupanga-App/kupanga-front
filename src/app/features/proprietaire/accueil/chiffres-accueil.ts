import { BienDTO } from '../../biens/models/bien.model';
import { QuittanceDTO } from '../../gestion-logement/models/quittance.model';
import { Devise } from '../../../core/money/montant';

/** Loyer attendu dans une devise (jamais de somme entre deux devises). */
export interface LoyerParDevise {
  devise: Devise | undefined;
  total: number;
  charges: number;
}

export interface ChiffresAccueil {
  actifs: number;
  loues: number;
  /** Pourcentage arrondi, 0 sans bien. */
  occupation: number;
  loyers: LoyerParDevise[];
  /** Quittances du mois des biens loués : absentes si aucune n'est encore créée. */
  quittancesDuMois: {
    nombre: number;
    recues: number;
    /** Première échéance du mois (AAAA-MM-JJ). */
    echeance: string | null;
  } | null;
  /** Biens actifs sans locataire ni réservation (en ligne dans Explorer). */
  annonces: number;
}

/**
 * Chiffres du mois de l'accueil propriétaire, à partir des données déjà chargées (`DonneesProprietaireService`).
 * `maintenant` sert au mois en cours (paramètre pour les tests).
 */
export function calculerChiffres(biens: readonly BienDTO[], quittances: readonly QuittanceDTO[], maintenant = new Date()): ChiffresAccueil {
  const actifs = biens.filter(b => !b.archive);
  const loues = actifs.filter(b => !!b.locataire);

  const parDevise = new Map<string, LoyerParDevise>();
  for (const b of loues) {
    const cle = b.devise ?? '';
    const ligne = parDevise.get(cle) ?? { devise: b.devise, total: 0, charges: 0 };
    const charges = Number(b.chargesMensuelles) || 0;
    ligne.total += (Number(b.loyerMensuel) || 0) + charges;
    ligne.charges += charges;
    parDevise.set(cle, ligne);
  }

  const mois = maintenant.getMonth() + 1;
  const annee = maintenant.getFullYear();
  const idsLoues = new Set(loues.map(b => b.id));
  const duMois = quittances.filter(q => q.bienId != null && idsLoues.has(q.bienId) && q.mois === mois && q.annee === annee);
  const echeances = duMois.map(q => q.dateEcheance).filter(Boolean).sort();

  return {
    actifs: actifs.length,
    loues: loues.length,
    occupation: actifs.length ? Math.round((loues.length / actifs.length) * 100) : 0,
    loyers: [...parDevise.values()],
    quittancesDuMois: duMois.length
      ? { nombre: duMois.length, recues: duMois.filter(q => q.statut === 'PAYEE').length, echeance: echeances[0] ?? null }
      : null,
    annonces: actifs.filter(b => !b.locataire && !b.reservation).length,
  };
}
