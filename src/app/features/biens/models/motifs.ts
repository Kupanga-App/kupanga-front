/** Mêmes règles que l'API (BienFormDTO). */
export const MOTIF_TITRE = /^[\p{L}0-9 ,.'"\-()]+$/u;
export const MOTIF_ADRESSE = /^[\p{L}0-9 ,.'°/#&\-]+$/u;
export const MOTIF_VILLE = /^[\p{L} \-']+$/u;
export const MOTIF_ADRESSE_RDC = /^[\p{L}0-9 ,.'°/#&\-]*$/u;
