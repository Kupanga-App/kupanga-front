import {
  COTE_MAX_PHOTO, NB_MAX_PHOTOS, PhotoRefuseeError, TAILLE_MAX_HEIC, TAILLE_MAX_PHOTO, preparerPhoto, reduirePhoto,
  verifierLotPhotos,
} from './photos';

/** Vraie image PNG (bruit aléatoire : fichier lourd, comme une photo). */
async function imagePng(largeur: number, hauteur: number, nom = 'photo.png'): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  const contexte = canvas.getContext('2d')!;
  const pixels = contexte.createImageData(largeur, hauteur);
  for (let i = 0; i < pixels.data.length; i++) pixels.data[i] = (i % 4 === 3) ? 255 : Math.random() * 255;
  contexte.putImageData(pixels, 0, 0);
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
  return new File([blob], nom, { type: 'image/png' });
}

async function dimensions(fichier: File): Promise<{ width: number; height: number }> {
  const image = await createImageBitmap(fichier);
  const resultat = { width: image.width, height: image.height };
  image.close();
  return resultat;
}

/** Fichier factice : seuls le nom, le type et la taille comptent ici. */
function fichier(nom: string, type: string, taille = 1024): File {
  const f = new File([new Uint8Array(1)], nom, { type });
  Object.defineProperty(f, 'size', { value: taille });
  return f;
}

describe('photos (B3, B5)', () => {
  it('accepte une photo JPEG de moins de 10 Mo telle quelle', async () => {
    const photo = fichier('salon.jpg', 'image/jpeg');
    expect(await preparerPhoto(photo)).toBe(photo);
  });

  it('accepte les formats des smartphones par l’extension quand le navigateur ne donne pas le type', async () => {
    const photo = fichier('cuisine.webp', '');
    expect(await preparerPhoto(photo)).toBe(photo);
  });

  it('refuse un AVIF que le navigateur n’a pas pu réencoder (R1 : refusé par l’API en photo publique)', async () => {
    await expectAsync(preparerPhoto(fichier('cuisine.avif', ''))).toBeRejectedWithError(PhotoRefuseeError, /AVIF/);
  });

  it('refuse un format non accepté', async () => {
    await expectAsync(preparerPhoto(fichier('plan.pdf', 'application/pdf'))).toBeRejectedWithError(PhotoRefuseeError);
    await expectAsync(preparerPhoto(fichier('page.html', 'text/html'))).toBeRejectedWithError(PhotoRefuseeError);
  });

  it('refuse une photo vide ou de plus de 10 Mo', async () => {
    await expectAsync(preparerPhoto(fichier('vide.png', 'image/png', 0))).toBeRejectedWithError(PhotoRefuseeError);
    await expectAsync(preparerPhoto(fichier('gros.png', 'image/png', TAILLE_MAX_PHOTO + 1)))
      .toBeRejectedWithError(PhotoRefuseeError, /10 Mo/);
  });

  it('refuse un HEIC trop lourd avant toute conversion', async () => {
    await expectAsync(preparerPhoto(fichier('IMG_0001.HEIC', 'image/heic', TAILLE_MAX_HEIC + 1)))
      .toBeRejectedWithError(PhotoRefuseeError, /25 Mo/);
  });

  it('refuse plus de 20 photos ou plus de 50 Mo au total', () => {
    const petite = fichier('a.jpg', 'image/jpeg', 1024);
    expect(() => verifierLotPhotos(Array(NB_MAX_PHOTOS).fill(petite))).not.toThrow();
    expect(() => verifierLotPhotos(Array(NB_MAX_PHOTOS + 1).fill(petite))).toThrowError(PhotoRefuseeError);
    const grosse = fichier('b.jpg', 'image/jpeg', 9 * 1024 * 1024);
    expect(() => verifierLotPhotos(Array(6).fill(grosse))).toThrowError(PhotoRefuseeError, /50 Mo/);
  });

  describe('réduction avant l’envoi (R1)', () => {
    it('réduit une grande photo à 1600 px de grand côté, en JPEG plus léger', async () => {
      const photo = await imagePng(2400, 1800, 'salon.png');

      const reduite = await reduirePhoto(photo);

      expect(reduite.type).toBe('image/jpeg');
      expect(reduite.name).toBe('salon.jpg');
      expect(reduite.size).toBeLessThan(photo.size);
      const { width, height } = await dimensions(reduite);
      expect(width).toBe(COTE_MAX_PHOTO);
      expect(height).toBe(1200);
    });

    it('garde telle quelle une petite photo légère', async () => {
      const photo = await imagePng(200, 150);
      expect(await reduirePhoto(photo)).toBe(photo);
    });

    it('garde la photo d’origine si le navigateur ne sait pas la décoder', async () => {
      const photo = fichier('cuisine.avif', 'image/avif', 2 * 1024 * 1024);
      expect(await reduirePhoto(photo)).toBe(photo);
    });

    it('réencode toujours un WEBP, même petit (métadonnées retirées)', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50;
      canvas.height = 40;
      const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/webp'));
      const webp = new File([blob], 'chambre.webp', { type: 'image/webp' });

      const resultat = await reduirePhoto(webp);

      expect(resultat.type).toBe('image/jpeg');
      expect(resultat.name).toBe('chambre.jpg');
    });

    it('preparerPhoto envoie la version réduite', async () => {
      const photo = await imagePng(2400, 1800);
      const preparee = await preparerPhoto(photo);
      expect(preparee.type).toBe('image/jpeg');
      expect((await dimensions(preparee)).width).toBe(COTE_MAX_PHOTO);
    });
  });
});
