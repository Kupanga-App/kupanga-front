import { nomCourt } from './nom-court';

describe('nomCourt', () => {
  it('prénom et initiale du nom', () => {
    expect(nomCourt('Claire', 'Martin')).toBe('Claire M.');
    expect(nomCourt('Claire Martin')).toBe('Claire M.');
    expect(nomCourt('Jean Marie Ilunga')).toBe('Jean Marie I.');
  });

  it('nom incomplet', () => {
    expect(nomCourt('Claire', '')).toBe('Claire');
    expect(nomCourt('Claire')).toBe('Claire');
    expect(nomCourt('', 'Martin')).toBe('Martin');
    expect(nomCourt(null)).toBe('');
  });
});
