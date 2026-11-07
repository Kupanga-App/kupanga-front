import { Subject } from 'rxjs';
import { ouvrirPdfFrais } from './pdf-frais';

interface FauxOnglet {
  opener: unknown;
  closed: boolean;
  document: { title: string; body: { textContent: string } };
  location: { href: string };
  close: jasmine.Spy;
}

function fauxOnglet(): FauxOnglet {
  const o: FauxOnglet = {
    opener: {}, closed: false, document: { title: '', body: { textContent: '' } }, location: { href: '' },
    close: jasmine.createSpy('close'),
  };
  o.close.and.callFake(() => { o.closed = true; });
  return o;
}

function fenetre(onglet: FauxOnglet | null): Window {
  return { open: jasmine.createSpy('open').and.returnValue(onglet) } as unknown as Window;
}

describe('ouvrirPdfFrais', () => {
  it('ouvre l’onglet au clic, avant la réponse, puis y charge l’adresse fraîche', () => {
    const onglet = fauxOnglet();
    const f = fenetre(onglet);
    const reponse = new Subject<{ urlPdf?: string | null }>();
    const emis: (string | null)[] = [];

    ouvrirPdfFrais(reponse, f).subscribe(v => emis.push(v));
    expect(f.open).toHaveBeenCalledWith('', '_blank');
    expect(onglet.opener).toBeNull();
    expect(onglet.location.href).toBe('');

    reponse.next({ urlPdf: 'https://stockage/bail.pdf?signature=fraiche' });
    expect(onglet.location.href).toBe('https://stockage/bail.pdf?signature=fraiche');
    expect(emis).toEqual([null]);
  });

  it('onglet bloqué : émet l’adresse pour un lien à toucher', () => {
    const reponse = new Subject<{ urlPdf?: string | null }>();
    const emis: (string | null)[] = [];
    ouvrirPdfFrais(reponse, fenetre(null)).subscribe(v => emis.push(v));
    reponse.next({ urlPdf: 'https://stockage/bail.pdf' });
    expect(emis).toEqual(['https://stockage/bail.pdf']);
  });

  it('erreur de lecture : referme l’onglet et transmet l’erreur', () => {
    const onglet = fauxOnglet();
    const reponse = new Subject<{ urlPdf?: string | null }>();
    let erreur: unknown = null;
    ouvrirPdfFrais(reponse, fenetre(onglet)).subscribe({ error: e => (erreur = e) });
    reponse.error({ status: 410 });
    expect(onglet.close).toHaveBeenCalled();
    expect(erreur).toEqual({ status: 410 });
  });

  it('document sans PDF : referme l’onglet et signale l’erreur', () => {
    const onglet = fauxOnglet();
    const reponse = new Subject<{ urlPdf?: string | null }>();
    let erreur: unknown = null;
    ouvrirPdfFrais(reponse, fenetre(onglet)).subscribe({ error: e => (erreur = e) });
    reponse.next({ urlPdf: null });
    expect(onglet.close).toHaveBeenCalled();
    expect(erreur).toEqual(jasmine.any(Error));
  });
});
