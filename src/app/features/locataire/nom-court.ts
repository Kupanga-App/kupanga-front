/**
 * « Claire M. » : prénom et initiale du nom, comme les maquettes. Accepte le prénom et le nom séparés, ou un nom
 * complet (« Claire Martin », dernier mot pris comme nom).
 */
export function nomCourt(prenomOuNom: string | null | undefined, nom?: string | null): string {
  let prenom = (prenomOuNom ?? '').trim();
  let famille = (nom ?? '').trim();
  if (nom === undefined) {
    const mots = prenom.split(/\s+/).filter(Boolean);
    if (mots.length < 2) return prenom;
    famille = mots.pop()!;
    prenom = mots.join(' ');
  }
  if (!famille) return prenom;
  return prenom ? `${prenom} ${famille.charAt(0).toUpperCase()}.` : famille;
}
