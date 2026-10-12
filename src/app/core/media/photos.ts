/**
 * Photos envoyées à l'API (B3, B5) : mêmes règles que le serveur, contrôlées avant l'envoi.
 * Au-delà d'environ 2 Mo refusés, le serveur coupe la connexion : le navigateur ne verrait qu'une erreur réseau
 * (status 0) au lieu du message de l'API. D'où le contrôle ici.
 */

/** 10 Mo par fichier (spring.servlet.multipart.max-file-size). */
export const TAILLE_MAX_PHOTO = 10 * 1024 * 1024;
/** 50 Mo par requête : toutes les photos d'un bien partent ensemble (max-request-size). */
export const TAILLE_MAX_TOTALE = 50 * 1024 * 1024;
/** HEIC accepté jusqu'à 25 Mo avant conversion : au-delà, le décodage fige l'onglet (téléphones modestes). */
export const TAILLE_MAX_HEIC = 25 * 1024 * 1024;
/** 20 photos au plus par bien. */
export const NB_MAX_PHOTOS = 20;

/** Formats reconnus par l'API au contenu du fichier (JPEG, PNG, WEBP, AVIF, GIF ; HEIC converti ici). */
const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const EXTENSIONS_ACCEPTEES = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
const EXTENSIONS_HEIC = ['heic', 'heif'];

/** Valeur de l'attribut accept des champs fichier. */
export const ACCEPT_PHOTOS = [...TYPES_ACCEPTES, 'image/heic', 'image/heif', '.heic', '.heif'].join(',');

export class PhotoRefuseeError extends Error {}

function extension(nom: string): string {
  const i = nom.lastIndexOf('.');
  return i >= 0 ? nom.slice(i + 1).toLowerCase() : '';
}

function estHeic(file: File): boolean {
  return file.type === 'image/heic' || file.type === 'image/heif' || EXTENSIONS_HEIC.includes(extension(file.name));
}

/**
 * Prépare une photo pour l'envoi : convertit HEIC/HEIF en JPEG (iPhone ; HEIC ne s'affiche que dans Safari),
 * puis vérifie le format et la taille.
 * @throws PhotoRefuseeError avec un message à afficher
 */
export async function preparerPhoto(file: File): Promise<File> {
  let photo = file;
  if (estHeic(file)) {
    if (file.size > TAILLE_MAX_HEIC) {
      throw new PhotoRefuseeError(`« ${file.name} » est trop lourde pour être convertie (25 Mo maximum).`);
    }
    try {
      const { default: heic2any } = await import('heic2any');
      const resultat = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
      const blob = Array.isArray(resultat) ? resultat[0] : resultat;
      photo = new File([blob], file.name.replace(/\.(heic|heif)$/i, '') + '.jpg', { type: 'image/jpeg' });
    } catch {
      throw new PhotoRefuseeError(`« ${file.name} » n'a pas pu être converti. Enregistrez-la en JPEG et réessayez.`);
    }
  }
  const typeConnu = TYPES_ACCEPTES.includes(photo.type) || EXTENSIONS_ACCEPTEES.includes(extension(photo.name));
  if (!typeConnu) {
    throw new PhotoRefuseeError(`« ${file.name} » : format non accepté (JPEG, PNG, WEBP, AVIF, GIF ou HEIC).`);
  }
  if (photo.size === 0) {
    throw new PhotoRefuseeError(`« ${file.name} » est vide.`);
  }
  photo = await reduirePhoto(photo);
  // R1 (revue) : l'API refuse l'AVIF en photo publique (position GPS impossible à retirer) ; normalement réencodé ci-dessus
  if (photo.type === 'image/avif' || extension(photo.name) === 'avif') {
    throw new PhotoRefuseeError(`« ${file.name} » : format AVIF non pris en charge par ce navigateur. Enregistrez-la en JPEG.`);
  }
  if (photo.size > TAILLE_MAX_PHOTO) {
    throw new PhotoRefuseeError(`« ${file.name} » dépasse 10 Mo.`);
  }
  return photo;
}

/** R1 : grand côté maximal des photos envoyées (l'API réduit aussi, à 1600 px et en vignette de 400 px). */
export const COTE_MAX_PHOTO = 1600;
/** En dessous, une photo qui ne dépasse pas 1600 px est envoyée telle quelle. */
const TAILLE_SANS_REDUCTION = 500 * 1024;
/** Au-delà, pas de décodage dans le navigateur (téléphones modestes) : la photo est refusée par la limite de 10 Mo. */
const TAILLE_MAX_REDUCTION = 25 * 1024 * 1024;
const QUALITE_JPEG = 0.85;

/**
 * R1 : réduit la photo à 1600 px de grand côté et la réencode en JPEG avant l'envoi : moins de données
 * montantes sur réseau mobile (une photo de smartphone de 4 Mo tombe vers 300 Ko), sans EXIF ni position GPS,
 * orientation appliquée. En cas d'échec (format que le navigateur ne décode pas, navigateur ancien), la photo
 * d'origine est gardée : l'API la contrôle et la réduit de toute façon.
 */
export async function reduirePhoto(photo: File): Promise<File> {
  if (photo.size > TAILLE_MAX_REDUCTION || typeof createImageBitmap !== 'function') {
    return photo;
  }
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(photo, { imageOrientation: 'from-image' });
  } catch {
    return photo;
  }
  try {
    const ratio = Math.min(1, COTE_MAX_PHOTO / Math.max(image.width, image.height));
    // WEBP et AVIF toujours réencodés : l'API ne sait pas les nettoyer de leurs métadonnées (AVIF refusé)
    const reencodageObligatoire = ['image/webp', 'image/avif'].includes(photo.type)
      || ['webp', 'avif'].includes(extension(photo.name));
    if (!reencodageObligatoire && ratio === 1 && photo.size <= TAILLE_SANS_REDUCTION) {
      return photo;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const contexte = canvas.getContext('2d');
    if (!contexte) return photo;
    // Fond blanc : le JPEG n'a pas de transparence (sinon fond noir)
    contexte.fillStyle = '#fff';
    contexte.fillRect(0, 0, canvas.width, canvas.height);
    contexte.imageSmoothingQuality = 'high';
    contexte.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALITE_JPEG));
    if (!blob || (!reencodageObligatoire && blob.size >= photo.size)) {
      return photo;
    }
    const nom = photo.name.replace(/\.[^.]*$/, '') || 'photo';
    return new File([blob], `${nom}.jpg`, { type: 'image/jpeg' });
  } catch {
    return photo;
  } finally {
    image.close();
  }
}

/**
 * Vérifie un lot de photos déjà préparées (photos d'un bien).
 * @throws PhotoRefuseeError si plus de 20 photos ou plus de 50 Mo au total
 */
export function verifierLotPhotos(photos: File[]): void {
  if (photos.length > NB_MAX_PHOTOS) {
    throw new PhotoRefuseeError(`${NB_MAX_PHOTOS} photos au maximum par bien.`);
  }
  const total = photos.reduce((somme, p) => somme + p.size, 0);
  if (total > TAILLE_MAX_TOTALE) {
    throw new PhotoRefuseeError('Les photos dépassent 50 Mo au total : retirez-en ou réduisez leur taille.');
  }
}
