import { calculerTaches, DonneesAccueil } from './taches';
import { BienDTO } from '../../biens/models/bien.model';
import { ContratDTO } from '../../gestion-logement/models/contrat.model';
import { EtatDesLieuxDTO } from '../../gestion-logement/models/edl.model';
import { QuittanceDTO } from '../../gestion-logement/models/quittance.model';

function bien(id: number, avecLocataire = true, archive = false): BienDTO {
  return {
    id, titre: `Bien ${id}`, archive,
    locataire: avecLocataire ? { id: 9, firstName: 'Awa', lastName: 'M', mail: 'a@b.cd' } : undefined,
  } as unknown as BienDTO;
}

function vide(): DonneesAccueil {
  return { biens: [], contrats: [], edlsParBien: new Map(), quittances: [], messagesNonLus: 0 };
}

function dans(jours: number): string {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('calculerTaches (accueil du propriétaire)', () => {
  it('rien à faire pour un bien vacant', () => {
    expect(calculerTaches({ ...vide(), biens: [bien(1, false)] })).toEqual([]);
  });

  it('bien loué sans bail : bail à créer', () => {
    const taches = calculerTaches({ ...vide(), biens: [bien(1)] });
    expect(taches.map(t => t.titre)).toEqual(['Bail à créer']);
    expect(taches[0].lien).toEqual(['/biens', 1, 'bail', 'nouveau']);
  });

  it('bail signé sans état des lieux d’entrée : état des lieux à faire', () => {
    const taches = calculerTaches({
      ...vide(),
      biens: [bien(1)],
      contrats: [{ id: 3, bienId: 1, statut: 'SIGNE' } as ContratDTO],
    });
    expect(taches.map(t => t.titre)).toEqual(['État des lieux d’entrée à faire']);
  });

  it('les documents à signer passent avant les messages', () => {
    const taches = calculerTaches({
      ...vide(),
      biens: [bien(1)],
      contrats: [{ id: 3, bienId: 1, statut: 'EN_ATTENTE_SIGNATURE_PROPRIO' } as ContratDTO],
      messagesNonLus: 2,
    });
    expect(taches.map(t => t.titre)).toEqual(['Bail à signer', '2 messages non lus']);
  });

  it('loyer en retard urgent, loyer attendu dans 3 jours, rien pour un loyer lointain', () => {
    const taches = calculerTaches({
      ...vide(),
      biens: [bien(1)],
      contrats: [{ id: 3, bienId: 1, statut: 'SIGNE' } as ContratDTO],
      edlsParBien: new Map([[1, [{ id: 4, type: 'ENTREE', statut: 'SIGNE' } as EtatDesLieuxDTO]]]),
      quittances: [
        { id: 10, bienId: 1, mois: 9, annee: 2026, statut: 'EN_RETARD', dateEcheance: dans(-20) } as QuittanceDTO,
        { id: 11, bienId: 1, mois: 10, annee: 2026, statut: 'EN_ATTENTE', dateEcheance: dans(3) } as QuittanceDTO,
        { id: 12, bienId: 1, mois: 11, annee: 2026, statut: 'EN_ATTENTE', dateEcheance: dans(30) } as QuittanceDTO,
      ],
    });
    expect(taches.map(t => [t.urgence, t.titre])).toEqual([
      ['urgent', 'Loyer de septembre 2026 en retard'],
      ['attention', 'Loyer d’octobre 2026 attendu'],
    ]);
  });

  it('ignore les biens archivés', () => {
    const taches = calculerTaches({
      ...vide(),
      biens: [bien(1, true, true)],
      contrats: [{ id: 3, bienId: 1, statut: 'EN_ATTENTE_SIGNATURE_PROPRIO' } as ContratDTO],
    });
    expect(taches).toEqual([]);
  });
});
