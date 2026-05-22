export interface MessagePayload {
  contenu: string;
  emailDestinataire: string;
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
