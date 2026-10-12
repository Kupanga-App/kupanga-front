export interface MessagePayload {
  contenu: string;
  /** Absent au premier contact depuis une annonce (P0-6) : l'API écrit au propriétaire du bien. */
  emailDestinataire?: string;
  bienId: number;
}

export interface MessageDTO {
  id: number;
  contenu: string;
  lu: boolean;
  createdAt: string;
  expediteurId: number;
  expediteurNom: string;
  expediteurEmail: string;
  destinataireId: number;
  destinataireNom: string;
  destinataireEmail: string;
  bienId: number;
  bienAdresse: string;
  /** Écho de son propre message par le serveur (accusé d'envoi, W13). */
  idClient?: string;
  /** Message local pas encore confirmé (W13) ; absent pour un message enregistré. */
  statut?: StatutEnvoi;
  erreur?: string;
}

export type StatutEnvoi = 'en_attente' | 'echec';

export interface StatutEnvoiEvent {
  idClient: string;
  statut: StatutEnvoi;
  erreur?: string;
}

/** Erreur d'envoi reçue sur /user/queue/errors. */
export interface ErreurEnvoiDTO {
  message: string;
  idClient?: string;
}

export interface NotificationDTO {
  conversationId: number;
  expediteurEmail: string;
  expediteurNom: string;
  contenuPreview: string;
  createdAt: string;
}

export interface ConversationDTO {
  id: number;
  bienId: number;
  bienTitre: string;
  emailExpediteur: string;
  emailDestinataire: string;
  expediteurName: string;
  destinataireName: string;
  expediteurPhotoUrl: string;
  destinatairePhotoUrl: string;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
  nonLuCount: number;
}

export interface ConversationPageDTO {
  contenu: ConversationDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierepage: boolean;
  premierepage: boolean;
}

export interface ConversationSearchDTO {
  nomDuBien?: string;
  lu?: boolean | null;
  page?: number;
  size?: number;
  sortBy?: 'id' | 'createdAt' | 'lastMessageAt';
  sortDirection?: 'ASC' | 'DESC';
}
