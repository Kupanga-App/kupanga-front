export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE';
  urlProfile?: string;
}
