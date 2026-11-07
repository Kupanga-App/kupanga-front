import { compteARebours } from './compte-a-rebours';

describe('compteARebours', () => {
  const maintenant = new Date('2026-11-07T10:00:00');

  it('jours restants lus dans la date d’expiration', () => {
    expect(compteARebours('2026-11-07T10:00:00', '2026-11-21T10:00:00', maintenant)).toEqual({ joursRestants: 14, progression: 0 });
  });

  it('une journée entamée compte comme restante', () => {
    expect(compteARebours('2026-11-01T10:00:00', '2026-11-08T09:00:00', maintenant)?.joursRestants).toBe(1);
  });

  it('progression : part écoulée entre la réservation et l’expiration', () => {
    const r = compteARebours('2026-10-31T10:00:00', '2026-11-14T10:00:00', maintenant);
    expect(r?.joursRestants).toBe(7);
    expect(r?.progression).toBeCloseTo(0.5, 5);
  });

  it('échéance passée : 0 jour, barre pleine', () => {
    expect(compteARebours('2026-10-01T10:00:00', '2026-10-15T10:00:00', maintenant)).toEqual({ joursRestants: 0, progression: 1 });
  });

  it('sans date de réservation : pas de progression', () => {
    expect(compteARebours(null, '2026-11-10T10:00:00', maintenant)).toEqual({ joursRestants: 3, progression: 0 });
  });

  it('date d’expiration absente ou illisible', () => {
    expect(compteARebours('2026-11-07', null, maintenant)).toBeNull();
    expect(compteARebours('2026-11-07', 'demain', maintenant)).toBeNull();
  });
});
