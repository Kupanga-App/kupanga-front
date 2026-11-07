import { bailLePlusRecent, calculerEtapesLocation, DonneesLocation, precisionEtat } from './etapes-location';
import { BienDTO, UserDTO } from '../biens/models/bien.model';
import { ContratDTO } from '../gestion-logement/models/contrat.model';
import { EtatDesLieuxDTO } from '../gestion-logement/models/edl.model';
import { QuittanceDTO } from '../gestion-logement/models/quittance.model';

const LUCAS = { id: 9, firstName: 'Lucas', lastName: 'Bernard', mail: 'lucas@kupanga.dev' } as UserDTO;
const INES = { id: 8, firstName: 'Inès', lastName: 'Moreau', mail: 'ines@kupanga.dev' } as UserDTO;

function bien(champs: Partial<BienDTO> = {}): BienDTO {
  return { id: 7, titre: 'Studio', archive: false, ...champs } as BienDTO;
}

function donnees(champs: Partial<DonneesLocation> = {}): DonneesLocation {
  return { bien: bien(), contrats: [], edls: [], quittances: [], ...champs };
}

function bail(statut: ContratDTO['statut'], champs: Partial<ContratDTO> = {}): ContratDTO {
  return { id: 1, bienId: 7, statut, dateDebut: '2026-11-06', locataire: LUCAS, ...champs } as ContratDTO;
}

const etats = (d: DonneesLocation) => calculerEtapesLocation(d).etapes.map(e => e.etat);

describe('calculerEtapesLocation', () => {
  it('bien vacant : annonce en ligne, locataire à choisir', () => {
    const r = calculerEtapesLocation(donnees());

    expect(r.etapes.map(e => e.libelle)).toEqual(['Annonce', 'Réservation', 'Bail', 'État des lieux', 'Quittances']);
    expect(etats(donnees())).toEqual(['fait', 'en-cours', 'a-venir', 'a-venir', 'a-venir']);
    expect(r.etapes[0].detail).toBe('Visible dans Explorer');
    expect(r.courante).toBe(1);
    expect(r.prochaine).toEqual(jasmine.objectContaining({
      titre: 'Choisissez votre locataire', action: 'Proposer la location', lien: ['/biens', 7, 'locataire'],
    }));
  });

  it('les documents d’un ancien locataire ne comptent pas pour un bien redevenu vacant', () => {
    const d = donnees({ contrats: [bail('SIGNE')], edls: [{ id: 3, type: 'ENTREE', statut: 'SIGNE' } as EtatDesLieuxDTO] });
    expect(etats(d)).toEqual(['fait', 'en-cours', 'a-venir', 'a-venir', 'a-venir']);
  });

  it('bien réservé sans bail : créer le bail du candidat', () => {
    const d = donnees({ bien: bien({ reservation: { id: 2, locataire: INES, dateReservation: '', dateExpiration: '' } }) });
    const r = calculerEtapesLocation(d);

    expect(etats(d)).toEqual(['fait', 'fait', 'en-cours', 'a-venir', 'a-venir']);
    expect(r.etapes[1].detail).toBe('Inès a accepté');
    expect(r.prochaine).toEqual(jasmine.objectContaining({
      titre: 'Créer le bail de Inès Moreau', action: 'Créer le bail', lien: ['/biens', 7, 'bail', 'nouveau'],
    }));
  });

  it('bien loué sans bail (avant le lot 3) : bail à créer, étape 3 sur 5', () => {
    const d = donnees({ bien: bien({ locataire: LUCAS }) });
    const r = calculerEtapesLocation(d);

    expect(r.courante).toBe(2);
    expect(r.etapes[1].detail).toBe('Lucas Bernard');
    expect(r.etapes[2].detail).toBe('À créer');
    expect(r.prochaine?.action).toBe('Créer le bail');
  });

  it('un bail annulé équivaut à pas de bail', () => {
    const r = calculerEtapesLocation(donnees({ bien: bien({ locataire: LUCAS }), contrats: [bail('ANNULE')] }));
    expect(r.prochaine?.action).toBe('Créer le bail');
  });

  it('bail à signer, en attente du locataire, lien expiré', () => {
    const avec = (statut: ContratDTO['statut']) =>
      calculerEtapesLocation(donnees({ bien: bien({ locataire: LUCAS }), contrats: [bail(statut)] }));

    expect(avec('EN_ATTENTE_SIGNATURE_PROPRIO').prochaine).toEqual(jasmine.objectContaining({ action: 'Signer le bail', lien: ['/biens', 7, 'bail'] }));
    expect(avec('EN_ATTENTE_SIGNATURE_PROPRIO').etapes[2].detail).toBe('À signer');
    expect(avec('EN_ATTENTE_SIGNATURE_LOCATAIRE').prochaine?.titre).toBe('Bail en attente de Lucas');
    expect(avec('EXPIRE').prochaine?.action).toBe('Renvoyer le lien');
  });

  it('prend le bail le plus récent, sans se fier à l’ordre reçu', () => {
    const ancien = bail('ANNULE', { id: 1, dateDebut: '2026-01-01' });
    const recent = bail('SIGNE', { id: 2, dateDebut: '2026-11-06' });
    const recree = bail('EN_ATTENTE_SIGNATURE_PROPRIO', { id: 3, dateDebut: '2026-11-06' });

    expect(bailLePlusRecent([ancien, recent])?.id).toBe(2);
    expect(bailLePlusRecent([recent, recree, ancien])?.id).toBe(3);
    expect(bailLePlusRecent([])).toBeNull();
  });

  it('bail signé : état des lieux d’entrée à faire, puis à signer', () => {
    const loue = { bien: bien({ locataire: LUCAS }), contrats: [bail('SIGNE')] };

    const sansEdl = calculerEtapesLocation(donnees(loue));
    expect(sansEdl.courante).toBe(3);
    expect(sansEdl.prochaine).toEqual(jasmine.objectContaining({ action: 'Commencer', lien: ['/biens', 7, 'etats-des-lieux', 'nouveau'] }));

    const aSigner = calculerEtapesLocation(donnees({
      ...loue, edls: [{ id: 4, type: 'ENTREE', statut: 'EN_ATTENTE_SIGNATURE_PROPRIO', emailLocataire: LUCAS.mail } as EtatDesLieuxDTO],
    }));
    expect(aSigner.etapes[3].detail).toBe('À signer');
    expect(aSigner.prochaine?.action).toBe('Signer');
  });

  it('un état des lieux de sortie ne remplace pas celui d’entrée', () => {
    const r = calculerEtapesLocation(donnees({
      bien: bien({ locataire: LUCAS }), contrats: [bail('SIGNE')],
      edls: [{ id: 5, type: 'SORTIE', statut: 'SIGNE' } as EtatDesLieuxDTO],
    }));
    expect(r.courante).toBe(3);
  });

  it('entrée signée : quittances en cours, avec leur nombre', () => {
    const base = {
      bien: bien({ locataire: LUCAS }), contrats: [bail('SIGNE')],
      edls: [{ id: 6, type: 'ENTREE', statut: 'SIGNE' } as EtatDesLieuxDTO],
    };
    expect(calculerEtapesLocation(donnees(base)).prochaine?.action).toBe('Créer la quittance');

    const q = { id: 1, statut: 'PAYEE', emailLocataire: LUCAS.mail } as QuittanceDTO;
    const r = calculerEtapesLocation(donnees({ ...base, quittances: [q, { ...q, id: 2 }] }));
    expect(etats(donnees({ ...base, quittances: [q] }))).toEqual(['fait', 'fait', 'fait', 'fait', 'en-cours']);
    expect(r.etapes[4].detail).toBe('2 quittances');
    expect(r.prochaine?.action).toBe('Voir les quittances');
  });

  it('précision de l’état pour l’en-tête de la fiche', () => {
    const loue = bien({ locataire: LUCAS });
    const avec = (contrats: ContratDTO[], edls: EtatDesLieuxDTO[] = []) =>
      precisionEtat(calculerEtapesLocation(donnees({ bien: loue, contrats, edls })));

    expect(avec([])).toBe('bail à créer');
    expect(avec([bail('EN_ATTENTE_SIGNATURE_LOCATAIRE')])).toBe('bail en attente de Lucas');
    expect(avec([bail('EXPIRE')])).toBe('lien du bail expiré');
    expect(avec([bail('SIGNE')])).toBe('état des lieux à faire');
    expect(avec([bail('SIGNE')], [{ id: 1, type: 'ENTREE', statut: 'SIGNE' } as EtatDesLieuxDTO])).toBeNull();
    expect(precisionEtat(calculerEtapesLocation(donnees()))).toBeNull();
  });

  it('bien archivé : pas de prochaine étape', () => {
    const r = calculerEtapesLocation(donnees({ bien: bien({ archive: true }) }));
    expect(r.prochaine).toBeNull();
    expect(r.etapes[0].detail).toBe('Bien archivé');
  });
});
