/**
 * Photos envoyées à l'API (B3, B5, R1), préparées dans le navigateur avant l'envoi.
 *
 * Toute image que le navigateur sait lire (JPEG, PNG, GIF, WEBP, AVIF, BMP, TIFF sous Safari, HEIC sous Safari…)
 * est réencodée en JPEG de 1600 px de grand côté au plus : le format d'origine n'a donc plus d'importance, et
 * le fichier envoyé est léger, sans EXIF ni position GPS, avec l'orientation appliquée. HEIC/HEIF que le navigateur
 * ne lit pas (Chrome, Firefox) sont convertis par `heic2any`. Seul un fichier illisible est refusé.
 *
 * Au-delà d'environ 2 Mo refusés, le serveur coupe la connexion : le navigateur ne verrait qu'une erreur réseau
 * (status 0) au lieu du message de l'API. D'où les contrôles de taille ici.
 */

/** 10 Mo par fichier (spring.servlet.multipart.max-file-size). */
export const TAILLE_MAX_PHOTO = 10 * 1024 * 1024;
/** 50 Mo par requête : toutes les photos d'un bien partent ensemble (max-request-size). */
export const TAILLE_MAX_TOTALE = 50 * 1024 * 1024;
/** HEIC accepté jusqu'à 25 Mo avant conversion : au-delà, le décodage fige l'onglet (téléphones modestes). */
export const TAILLE_MAX_HEIC = 25 * 1024 * 1024;
/** Au-delà, pas de décodage dans le navigateur (téléphones modestes). */
export const TAILLE_MAX_DECODAGE = 25 * 1024 * 1024;
/** 20 photos au plus par bien. */
export const NB_MAX_PHOTOS = 20;
/** R1 : grand côté maximal des photos envoyées (l'API réduit aussi, à 1600 px et en vignette de 400 px). */
export const COTE_MAX_PHOTO = 1600;

/** Formats que l'API sait lire elle-même : envoyés tels quels si le navigateur ne sait pas les décoder. */
const TYPES_API = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
const EXTENSIONS_API = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff'];
const EXTENSIONS_HEIC = ['heic', 'heif'];
const QUALITE_JPEG = 0.85;
/** Délai maximal de lecture d'une image par l'élément `<img>` (fichier corrompu qui ne se termine jamais). */
const DELAI_LECTURE_MS = 15_000;

/** Valeur de l'attribut accept des champs fichier : toutes les images (la galerie du téléphone les propose toutes). */
export const ACCEPT_PHOTOS = 'image/*,.heic,.heif';

export class PhotoRefuseeError extends Error {}

function extension(nom: string): string {
  const i = nom.lastIndexOf('.');
  return i >= 0 ? nom.slice(i + 1).toLowerCase() : '';
}

function estHeic(file: File): boolean {
  return file.type === 'image/heic' || file.type === 'image/heif' || EXTENSIONS_HEIC.includes(extension(file.name));
}

function lisibleParApi(file: File): boolean {
  return TYPES_API.includes(file.type) || EXTENSIONS_API.includes(extension(file.name));
}

function nomJpeg(nom: string): string {
  return (nom.replace(/\.[^.]*$/, '') || 'photo') + '.jpg';
}

/**
 * Prépare une photo pour l'envoi. Toute image lisible est acceptée, quelle que soit sa taille d'origine
 * (dans la limite de ce que le téléphone peut décoder) : elle repart en JPEG réduit.
 * @throws PhotoRefuseeError avec un message à afficher
 */
export async function preparerPhoto(file: File): Promise<File> {
  if (file.size === 0) {
    throw new PhotoRefuseeError(`« ${file.name} » est vide.`);
  }
  if (estHeic(file) && file.size > TAILLE_MAX_HEIC) {
    throw new PhotoRefuseeError(`« ${file.name} » est trop lourde pour être convertie (25 Mo maximum).`);
  }
  if (file.size > TAILLE_MAX_DECODAGE) {
    throw new PhotoRefuseeError(`« ${file.name} » est trop lourde (25 Mo maximum).`);
  }

  // 1. Image lue par le navigateur : réencodée en JPEG (format d'origine sans importance)
  let photo = await versJpeg(file);

  // 2. HEIC/HEIF que le navigateur ne lit pas (Chrome, Firefox) : conversion, puis réduction
  if (!photo && estHeic(file)) {
    const converti = await convertirHeic(file);
    photo = (await versJpeg(converti)) ?? converti;
  }

  // 3. Navigateur incapable de décoder (ancien, ou format qu'il ignore) : l'API lit elle-même ces formats
  if (!photo && lisibleParApi(file)) {
    photo = file;
  }

  if (!photo) {
    throw new PhotoRefuseeError(`« ${file.name} » n’est pas une image lisible. Enregistrez-la en JPEG et réessayez.`);
  }
  if (photo.size > TAILLE_MAX_PHOTO) {
    throw new PhotoRefuseeError(`« ${file.name} » dépasse 10 Mo.`);
  }
  return photo;
}

async function convertirHeic(file: File): Promise<File> {
  try {
    const { default: heic2any } = await import('heic2any');
    const resultat = await heic2any({ blob: file, toType: 'image/jpeg', quality: QUALITE_JPEG });
    const blob = Array.isArray(resultat) ? resultat[0] : resultat;
    return new File([blob], nomJpeg(file.name), { type: 'image/jpeg' });
  } catch {
    throw new PhotoRefuseeError(`« ${file.name} » n'a pas pu être converti. Enregistrez-la en JPEG et réessayez.`);
  }
}

/** Image décodée par le navigateur (bitmap, ou élément `<img>` pour les formats que `createImageBitmap` refuse). */
type Source = { image: CanvasImageSource; largeur: number; hauteur: number; liberer: () => void };

async function decoder(file: File): Promise<Source | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { image: bitmap, largeur: bitmap.width, hauteur: bitmap.height, liberer: () => bitmap.close() };
    } catch {
      // Format refusé par createImageBitmap (SVG, certains TIFF/BMP) : essai par l'élément <img>
    }
  }
  if (typeof document === 'undefined') return null;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  try {
    await Promise.race([
      img.decode(),
      new Promise((_, refus) => setTimeout(() => refus(new Error('délai')), DELAI_LECTURE_MS)),
    ]);
    if (!img.naturalWidth || !img.naturalHeight) {
      URL.revokeObjectURL(url);
      return null;
    }
    return { image: img, largeur: img.naturalWidth, hauteur: img.naturalHeight, liberer: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/**
 * R1 : JPEG d'au plus 1600 px de grand côté, sans EXIF ni GPS (fond blanc sous la transparence).
 * @return null si le navigateur ne sait pas lire l'image
 */
async function versJpeg(file: File): Promise<File | null> {
  const source = await decoder(file);
  if (!source) return null;
  try {
    const ratio = Math.min(1, COTE_MAX_PHOTO / Math.max(source.largeur, source.hauteur));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.largeur * ratio));
    canvas.height = Math.max(1, Math.round(source.hauteur * ratio));
    const contexte = canvas.getContext('2d');
    if (!contexte) return null;
    contexte.fillStyle = '#fff';
    contexte.fillRect(0, 0, canvas.width, canvas.height);
    contexte.imageSmoothingQuality = 'high';
    contexte.drawImage(source.image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALITE_JPEG));
    return blob ? new File([blob], nomJpeg(file.name), { type: 'image/jpeg' }) : null;
  } catch {
    return null;
  } finally {
    source.liberer();
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
