import {
  COTE_MAX_PHOTO, NB_MAX_PHOTOS, PhotoRefuseeError, TAILLE_MAX_DECODAGE, TAILLE_MAX_HEIC, TAILLE_MAX_PHOTO, preparerPhoto,
  verifierLotPhotos,
} from './photos';

/** Vraie image produite par le navigateur (bruit aléatoire : fichier lourd, comme une photo). */
async function image(largeur: number, hauteur: number, type: string, nom: string): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  const contexte = canvas.getContext('2d')!;
  const pixels = contexte.createImageData(largeur, hauteur);
  for (let i = 0; i < pixels.data.length; i++) pixels.data[i] = (i % 4 === 3) ? 255 : Math.random() * 255;
  contexte.putImageData(pixels, 0, 0);
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), type));
  return new File([blob], nom, { type });
}

/** Vrai BMP 24 bits de 2 × 2 pixels (format que l'ancien contrôle refusait, même minuscule). */
function bmp(): File {
  const octets = new Uint8Array(70);
  const vue = new DataView(octets.buffer);
  octets[0] = 0x42; octets[1] = 0x4d; // « BM »
  vue.setUint32(2, 70, true);
  vue.setUint32(10, 54, true);
  vue.setUint32(14, 40, true);
  vue.setInt32(18, 2, true);
  vue.setInt32(22, 2, true);
  vue.setUint16(26, 1, true);
  vue.setUint16(28, 24, true);
  vue.setUint32(34, 16, true);
  octets.fill(0x80, 54);
  return new File([octets], 'scan.bmp', { type: 'image/bmp' });
}

async function dimensions(fichier: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(fichier);
  const resultat = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return resultat;
}

/** Fichier factice illisible : seuls le nom, le type et la taille comptent ici. */
function fichier(nom: string, type: string, taille = 1024): File {
  const f = new File([new Uint8Array(1)], nom, { type });
  Object.defineProperty(f, 'size', { value: taille });
  return f;
}

describe('photos (B3, B5, R1)', () => {
  it('accepte une petite photo PNG et l’envoie en JPEG', async () => {
    const photo = await image(200, 150, 'image/png', 'chambre.png');
    const preparee = await preparerPhoto(photo);
    expect(preparee.type).toBe('image/jpeg');
    expect(preparee.name).toBe('chambre.jpg');
    expect(await dimensions(preparee)).toEqual({ width: 200, height: 150 });
  });

  it('accepte un petit BMP (format inconnu de l’API) en le convertissant en JPEG', async () => {
    const preparee = await preparerPhoto(bmp());
    expect(preparee.type).toBe('image/jpeg');
    expect(preparee.name).toBe('scan.jpg');
  });

  it('accepte une image sans type ni extension si le navigateur la lit', async () => {
    const png = await image(40, 30, 'image/png', 'x.png');
    const sansNom = new File([png], 'IMG-20261013-WA0007', { type: '' });
    expect((await preparerPhoto(sansNom)).type).toBe('image/jpeg');
  });

  it('réencode toujours un WEBP (métadonnées retirées)', async () => {
    const preparee = await preparerPhoto(await image(50, 40, 'image/webp', 'salon.webp'));
    expect(preparee.type).toBe('image/jpeg');
  });

  it('réduit une grande photo à 1600 px de grand côté', async () => {
    const preparee = await preparerPhoto(await image(2400, 1800, 'image/png', 'salon.png'));
    expect(await dimensions(preparee)).toEqual({ width: COTE_MAX_PHOTO, height: 1200 });
  });

  it('envoie tel quel un format lu par l’API quand le navigateur ne sait pas le décoder', async () => {
    const photo = fichier('salon.jpg', 'image/jpeg');
    expect(await preparerPhoto(photo)).toBe(photo);
  });

  it('refuse un fichier illisible qui n’est pas une image', async () => {
    await expectAsync(preparerPhoto(fichier('plan.pdf', 'application/pdf'))).toBeRejectedWithError(PhotoRefuseeError, /lisible/);
    await expectAsync(preparerPhoto(fichier('page.html', 'text/html'))).toBeRejectedWithError(PhotoRefuseeError);
    await expectAsync(preparerPhoto(fichier('cuisine.avif', ''))).toBeRejectedWithError(PhotoRefuseeError);
  });

  it('refuse une photo vide, ou trop lourde pour être décodée sur un téléphone', async () => {
    await expectAsync(preparerPhoto(fichier('vide.png', 'image/png', 0))).toBeRejectedWithError(PhotoRefuseeError, /vide/);
    await expectAsync(preparerPhoto(fichier('gros.png', 'image/png', TAILLE_MAX_DECODAGE + 1)))
      .toBeRejectedWithError(PhotoRefuseeError, /25 Mo/);
    await expectAsync(preparerPhoto(fichier('moyen.jpg', 'image/jpeg', TAILLE_MAX_PHOTO + 1)))
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
});
