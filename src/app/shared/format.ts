import { Pipe, PipeTransform } from '@angular/core';
import { ContratStatut } from '../features/gestion-logement/models/contrat.model';
import { EdlStatut } from '../features/gestion-logement/models/edl.model';
import { QuittanceStatut } from '../features/gestion-logement/models/quittance.model';

// ── Statuts des documents (puce colorée + libellé court) ─────────────────────

export type Ton = 'ok' | 'attention' | 'danger' | 'info' | 'neutre';

export interface Statut {
  libelle: string;
  ton: Ton;
}

export type PointDeVue = 'proprietaire' | 'locataire';

/** Bail ou état des lieux : mêmes étapes de signature. */
export function statutSignature(statut: ContratStatut | EdlStatut | string | null | undefined, vue: PointDeVue): Statut {
  switch (statut) {
    case 'BROUILLON':
      return { libelle: 'Brouillon', ton: 'neutre' };
    case 'EN_ATTENTE_SIGNATURE_PROPRIO':
      return vue === 'proprietaire'
        ? { libelle: 'À signer', ton: 'attention' }
        : { libelle: 'En attente du propriétaire', ton: 'info' };
    case 'EN_ATTENTE_SIGNATURE_LOCATAIRE':
      return vue === 'locataire'
        ? { libelle: 'À signer', ton: 'attention' }
        : { libelle: 'En attente du locataire', ton: 'info' };
    case 'SIGNE':
      return { libelle: 'Signé', ton: 'ok' };
    case 'EXPIRE':
      return { libelle: 'Lien expiré', ton: 'danger' };
    case 'ANNULE':
      return { libelle: 'Annulé', ton: 'neutre' };
    default:
      return { libelle: statut ?? '', ton: 'neutre' };
  }
}

export function statutQuittance(statut: QuittanceStatut | string | null | undefined): Statut {
  switch (statut) {
    case 'PAYEE':
      return { libelle: 'Loyer reçu', ton: 'ok' };
    case 'EN_ATTENTE':
      return { libelle: 'En attente', ton: 'attention' };
    case 'EN_RETARD':
      return { libelle: 'En retard', ton: 'danger' };
    case 'IMPAYEE':
      return { libelle: 'Impayé', ton: 'danger' };
    default:
      return { libelle: statut ?? '', ton: 'neutre' };
  }
}

/** Classe CSS de la puce (`styles/_components.scss`). */
export function classeStatut(s: Statut): string {
  return s.ton === 'neutre' ? 'kp-statut' : `kp-statut kp-statut--${s.ton}`;
}

// ── Dates ────────────────────────────────────────────────────────────────────

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function versDate(valeur: string | Date | null | undefined): Date | null {
  if (!valeur) return null;
  if (valeur instanceof Date) return isNaN(valeur.getTime()) ? null : valeur;
  // « AAAA-MM-JJ » lu comme une date locale (sinon minuit UTC décale d'un jour à l'ouest)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(valeur);
  return isNaN(d.getTime()) ? null : d;
}

/** « 5 octobre 2026 » (année omise si c'est l'année en cours et `courte`). */
export function dateLongue(valeur: string | Date | null | undefined, courte = false): string {
  const d = versDate(valeur);
  if (!d) return '';
  const annee = courte && d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MOIS[d.getMonth()]}${annee}`;
}

/** « octobre 2026 » ; `mois` de 1 à 12. */
export function moisAnnee(mois: number | string | null | undefined, annee: number | null | undefined): string {
  const n = Number(mois);
  const nom = Number.isInteger(n) && n >= 1 && n <= 12 ? MOIS[n - 1] : (mois ?? '').toString().toLowerCase();
  return [nom, annee ?? ''].filter(Boolean).join(' ');
}

/** « de septembre », « d’octobre » (élision devant une voyelle). */
export function de(texte: string): string {
  return /^[aeiouyàâéèêîôû]/i.test(texte) ? `d’${texte}` : `de ${texte}`;
}

/** Nombre de jours entre aujourd'hui et la date (négatif si passée). */
export function joursAvant(valeur: string | Date | null | undefined): number | null {
  const d = versDate(valeur);
  if (!d) return null;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const cible = new Date(d);
  cible.setHours(0, 0, 0, 0);
  return Math.round((cible.getTime() - aujourdhui.getTime()) / 86_400_000);
}

/** « aujourd'hui », « demain », « dans 3 jours », « il y a 2 jours », sinon la date. */
export function dateRelative(valeur: string | Date | null | undefined): string {
  const j = joursAvant(valeur);
  if (j === null) return '';
  if (j === 0) return 'aujourd’hui';
  if (j === 1) return 'demain';
  if (j === -1) return 'hier';
  if (j > 1 && j <= 14) return `dans ${j} jours`;
  if (j < -1 && j >= -14) return `il y a ${-j} jours`;
  return `le ${dateLongue(valeur, true)}`;
}

/** Heure d'un message : « 14:05 » aujourd'hui, « hier », « 5 oct. », sinon « 05/10/2025 ». */
export function heureMessage(valeur: string | null | undefined): string {
  const d = versDate(valeur);
  if (!d) return '';
  const j = joursAvant(d);
  if (j === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (j === -1) return 'hier';
  if (d.getFullYear() === new Date().getFullYear()) {
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('fr-FR');
}

/** Date du jour au format AAAA-MM-JJ (champs `<input type="date">`). */
export function aujourdhuiIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Pipe({ name: 'dateLongue', standalone: true })
export class DateLonguePipe implements PipeTransform {
  transform(valeur: string | Date | null | undefined, courte = false): string {
    return dateLongue(valeur, courte);
  }
}

@Pipe({ name: 'dateRelative', standalone: true })
export class DateRelativePipe implements PipeTransform {
  transform(valeur: string | Date | null | undefined): string {
    return dateRelative(valeur);
  }
}
