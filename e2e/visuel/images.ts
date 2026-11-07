import type { Browser } from '@playwright/test';

/**
 * Traitement d'images sans outil supplémentaire : un canevas dans une page Edge vierge.
 * - `decouper` : un téléphone dans une planche de maquettes ;
 * - `comparer` : part des pixels qui diffèrent nettement, et image de différence (rouge sur l'écran estompé).
 */

const enDonnees = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`;

export async function decouper(browser: Browser, png: Buffer, x: number, y: number, largeur: number, hauteur: number): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    const sortie = await page.evaluate(async ({ src, x, y, largeur, hauteur }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canevas = document.createElement('canvas');
      canevas.width = largeur;
      canevas.height = hauteur;
      canevas.getContext('2d')!.drawImage(img, x, y, largeur, hauteur, 0, 0, largeur, hauteur);
      return canevas.toDataURL('image/png').split(',')[1];
    }, { src: enDonnees(png), x, y, largeur, hauteur });
    return Buffer.from(sortie, 'base64');
  } finally {
    await page.close();
  }
}

/**
 * Compare la capture à la maquette (à la taille de la maquette ; une capture plus courte est complétée de blanc).
 * Un pixel diffère si la distance de couleur dépasse `seuil` (0 à 1, 0,1 par défaut).
 */
export async function comparer(browser: Browser, capture: Buffer, maquette: Buffer, seuil = 0.1): Promise<{ ratio: number; difference: Buffer }> {
  const page = await browser.newPage();
  try {
    const { ratio, diff } = await page.evaluate(async ({ a, b, seuil }) => {
      const charger = async (src: string) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        return img;
      };
      const [ia, ib] = await Promise.all([charger(a), charger(b)]);
      const l = ib.width;
      const h = ib.height;
      const pixels = (img: HTMLImageElement) => {
        const c = document.createElement('canvas');
        c.width = l;
        c.height = h;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, l, h);
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, l, h);
      };
      const pa = pixels(ia).data;
      const pb = pixels(ib).data;
      const sortie = document.createElement('canvas');
      sortie.width = l;
      sortie.height = h;
      const ctx = sortie.getContext('2d')!;
      const image = ctx.createImageData(l, h);
      let differents = 0;
      for (let i = 0; i < pa.length; i += 4) {
        const d = Math.hypot(pa[i] - pb[i], pa[i + 1] - pb[i + 1], pa[i + 2] - pb[i + 2]) / 441.7;
        if (d > seuil) {
          differents += 1;
          image.data.set([220, 38, 38, 255], i);
        } else {
          const gris = 255 - (255 - (pa[i] + pa[i + 1] + pa[i + 2]) / 3) * 0.25;
          image.data.set([gris, gris, gris, 255], i);
        }
      }
      ctx.putImageData(image, 0, 0);
      return { ratio: differents / (l * h), diff: sortie.toDataURL('image/png').split(',')[1] };
    }, { a: enDonnees(capture), b: enDonnees(maquette), seuil });
    return { ratio, difference: Buffer.from(diff, 'base64') };
  } finally {
    await page.close();
  }
}
