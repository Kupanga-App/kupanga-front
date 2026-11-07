import { calculerChiffres } from './chiffres-accueil';
import { BienDTO, UserDTO } from '../../biens/models/bien.model';
import { QuittanceDTO } from '../../gestion-logement/models/quittance.model';

const LUCAS = { id: 9, firstName: 'Lucas', lastName: 'Bernard', mail: 'l@k.dev' } as UserDTO;
const NOV = new Date(2026, 10, 7);

function bien(id: number, champs: Partial<BienDTO> = {}): BienDTO {
  return { id, titre: `Bien ${id}`, archive: false, devise: 'EUR', loyerMensuel: 300, chargesMensuelles: 40, ...champs } as BienDTO;
}

function quittance(bienId: number, champs: Partial<QuittanceDTO> = {}): QuittanceDTO {
  return { id: bienId * 10, bienId, mois: 11, annee: 2026, statut: 'EN_ATTENTE', dateEcheance: '2026-11-05', ...champs } as QuittanceDTO;
}

describe('calculerChiffres (accueil du propriétaire)', () => {
  it('biens loués, occupation, annonces en ligne (sans les biens réservés ni archivés)', () => {
    const c = calculerChiffres([
      bien(1, { locataire: LUCAS }),
      bien(2),
      bien(3, { reservation: { id: 1, locataire: LUCAS, dateReservation: '', dateExpiration: '' } }),
      bien(4, { archive: true }),
    ], [], NOV);

    expect([c.actifs, c.loues, c.occupation, c.annonces]).toEqual([3, 1, 33, 1]);
  });

  it('loyer attendu : loyer + charges des biens loués, un montant par devise', () => {
    const c = calculerChiffres([
      bien(1, { locataire: LUCAS }),
      bien(2, { locataire: LUCAS, loyerMensuel: 500, chargesMensuelles: 0 }),
      bien(3, { locataire: LUCAS, devise: 'USD', loyerMensuel: 450, chargesMensuelles: undefined }),
      bien(4),
    ], [], NOV);

    expect(c.loyers).toEqual([
      { devise: 'EUR', total: 840, charges: 40 },
      { devise: 'USD', total: 450, charges: 0 },
    ]);
  });

  it('quittances du mois : échéance la plus proche et loyers déclarés reçus ; rien sans quittance du mois', () => {
    const biens = [bien(1, { locataire: LUCAS }), bien(2, { locataire: LUCAS })];

    expect(calculerChiffres(biens, [quittance(1, { mois: 10 })], NOV).quittancesDuMois).toBeNull();
    expect(calculerChiffres(biens, [
      quittance(1, { dateEcheance: '2026-11-10', statut: 'PAYEE' }),
      quittance(2, { dateEcheance: '2026-11-05' }),
      quittance(9),
    ], NOV).quittancesDuMois).toEqual({ nombre: 2, recues: 1, echeance: '2026-11-05' });
  });

  it('aucun bien : zéro partout', () => {
    expect(calculerChiffres([], [], NOV)).toEqual({ actifs: 0, loues: 0, occupation: 0, loyers: [], quittancesDuMois: null, annonces: 0 });
  });
});
