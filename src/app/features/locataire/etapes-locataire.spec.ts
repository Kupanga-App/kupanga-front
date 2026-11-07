import { DonneesEtapesLocataire, bailCourant, calculerEtapesLocataire } from './etapes-locataire';

function donnees(d: Partial<DonneesEtapesLocataire> = {}): DonneesEtapesLocataire {
  return {
    reserve: false, proprietaire: 'Claire M.', baux: [], bailSigne: null, invitationsBail: [],
    etatsDesLieux: [], nombreQuittances: 0, ...d,
  };
}

const etats = (d: DonneesEtapesLocataire) => calculerEtapesLocataire(d).etapes.map(e => e.etat);
const details = (d: DonneesEtapesLocataire) => calculerEtapesLocataire(d).etapes.map(e => e.detail);

describe('calculerEtapesLocataire', () => {
  it('logement réservé : demande acceptée, bail préparé par le propriétaire', () => {
    const d = donnees({ reserve: true });
    const r = calculerEtapesLocataire(d);
    expect(r.courante).toBe(1);
    expect(etats(d)).toEqual(['fait', 'en-cours', 'a-venir', 'a-venir', 'a-venir']);
    expect(r.etapes[0].detail).toBe('Réservé pour vous');
    expect(r.etapes[1].libelle).toBe('Bail');
    expect(r.etapes[1].detail).toBe('Préparé par Claire M.');
    expect(r.etapes[2].detail).toBe('Par lien');
    expect(r.etapes[3].detail).toBe('Entrée, avec Claire');
    expect(r.etapes[4].detail).toBe('Chaque mois');
  });

  it('réservé : les documents éventuels ne comptent pas', () => {
    const d = donnees({ reserve: true, baux: [{ id: 2, statut: 'SIGNE' }], nombreQuittances: 3 });
    expect(calculerEtapesLocataire(d).courante).toBe(1);
  });

  it('bail signé par le propriétaire, en attente du locataire : « Votre signature » en cours', () => {
    const d = donnees({ baux: [{ id: 2, statut: 'EN_ATTENTE_SIGNATURE_LOCATAIRE', proprietaireASigné: true }] });
    const r = calculerEtapesLocataire(d);
    expect(r.courante).toBe(2);
    expect(r.etapes[1].libelle).toBe('Bail créé');
    expect(details(d).slice(0, 3)).toEqual(['Réservé pour vous', 'Signé par Claire M.', 'À faire']);
  });

  it('sans les baux (hors ligne) : l’invitation à signer suffit', () => {
    const d = donnees({ invitationsBail: [2] });
    expect(calculerEtapesLocataire(d).courante).toBe(2);
  });

  it('une invitation pour le bail déjà signé ne remet pas la signature à faire', () => {
    const d = donnees({ bailSigne: { id: 1 }, invitationsBail: [1] });
    expect(calculerEtapesLocataire(d).courante).toBe(3);
  });

  it('lien du bail expiré', () => {
    const d = donnees({ baux: [{ id: 2, statut: 'EXPIRE', proprietaireASigné: true }] });
    expect(calculerEtapesLocataire(d).etapes[2].detail).toBe('Lien expiré');
  });

  it('bail en préparation (brouillon) : étape « Bail » en cours', () => {
    const d = donnees({ baux: [{ id: 3, statut: 'BROUILLON' }] });
    const r = calculerEtapesLocataire(d);
    expect(r.courante).toBe(1);
    expect(r.etapes[1].detail).toBe('Préparé par Claire M.');
  });

  it('bail signé, état des lieux d’entrée à signer', () => {
    const d = donnees({
      bailSigne: { id: 1 },
      etatsDesLieux: [{ type: 'ENTREE', statut: 'EN_ATTENTE_SIGNATURE_LOCATAIRE' }],
    });
    const r = calculerEtapesLocataire(d);
    expect(r.courante).toBe(3);
    expect(r.etapes[0].detail).toBe('Terminé');
    expect(r.etapes[2].detail).toBe('Signé');
    expect(r.etapes[3].detail).toBe('À signer');
  });

  it('état des lieux en attente du propriétaire', () => {
    const d = donnees({ bailSigne: { id: 1 }, etatsDesLieux: [{ type: 'ENTREE', statut: 'EN_ATTENTE_SIGNATURE_PROPRIO' }] });
    expect(calculerEtapesLocataire(d).etapes[3].detail).toBe('En attente de Claire M.');
  });

  it('un état des lieux de sortie ne compte pas pour l’entrée', () => {
    const d = donnees({ bailSigne: { id: 1 }, etatsDesLieux: [{ type: 'SORTIE', statut: 'SIGNE' }] });
    expect(calculerEtapesLocataire(d).courante).toBe(3);
  });

  it('tout est fait : bail et état des lieux signés, quittances reçues', () => {
    const d = donnees({
      bailSigne: { id: 1 },
      etatsDesLieux: [{ type: 'ENTREE', statut: 'EN_ATTENTE_SIGNATURE_LOCATAIRE' }, { type: 'ENTREE', statut: 'SIGNE' }],
      nombreQuittances: 3,
    });
    const r = calculerEtapesLocataire(d);
    expect(r.courante).toBe(5);
    expect(etats(d).every(e => e === 'fait')).toBeTrue();
    expect(r.etapes[4].detail).toBe('3 quittances');
  });

  it('une seule étape en cours même si une étape suivante est faite', () => {
    const d = donnees({ etatsDesLieux: [{ type: 'ENTREE', statut: 'SIGNE' }], nombreQuittances: 1 });
    expect(etats(d)).toEqual(['fait', 'en-cours', 'a-venir', 'a-venir', 'a-venir']);
  });

  it('propriétaire inconnu', () => {
    const d = donnees({ reserve: true, proprietaire: '' });
    expect(details(d)[1]).toBe('Préparé par le propriétaire');
  });
});

describe('bailCourant', () => {
  it('prend le bail le plus récent qui n’est pas annulé', () => {
    expect(bailCourant([{ id: 1, statut: 'SIGNE' }, { id: 4, statut: 'ANNULE' }, { id: 3, statut: 'EXPIRE' }])?.id).toBe(3);
    expect(bailCourant([])).toBeNull();
  });
});
