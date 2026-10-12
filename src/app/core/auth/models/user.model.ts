export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE';
  urlProfile?: string;
  /** C6 : numéro de contact facultatif (E.164), non vérifié. */
  telephone?: string | null;
}
