import { Observable } from 'rxjs';

/**
 * PDF d'un document à signer : son `urlPdf` est une adresse signée qui expire au bout de quelques minutes. Au clic,
 * on relit le document (même `GET` par le jeton) et on ouvre l'adresse fraîche.
 *
 * Un `window.open` lancé après un appel asynchrone est bloqué par les navigateurs (Safari iOS compris) : l'onglet
 * est donc ouvert **au clic**, vide, puis reçoit l'adresse quand la réponse arrive. S'il n'a pas pu s'ouvrir,
 * l'observable émet l'adresse fraîche pour que l'écran propose un lien à toucher ; sinon il émet `null`.
 * En cas d'erreur (lien devenu invalide, réseau), l'onglet ouvert est refermé et l'erreur transmise.
 */
export function ouvrirPdfFrais(relire: Observable<{ urlPdf?: string | null }>, fenetre: Window = window): Observable<string | null> {
  return new Observable<string | null>(abonne => {
    const onglet = fenetre.open('', '_blank');
    if (onglet) {
      try {
        // L'onglet n'a pas besoin de revenir vers la page de signature
        onglet.opener = null;
        onglet.document.title = 'PDF';
        onglet.document.body.textContent = 'Chargement du PDF…';
      } catch {
        // Onglet d'une autre origine ou déjà fermé : on se contente d'y charger l'adresse
      }
    }
    const fermer = () => {
      if (onglet && !onglet.closed) onglet.close();
    };
    const lecture = relire.subscribe({
      next: document => {
        const url = document?.urlPdf;
        if (!url) {
          fermer();
          abonne.error(new Error('PDF indisponible'));
          return;
        }
        if (onglet && !onglet.closed) {
          onglet.location.href = url;
          abonne.next(null);
        } else {
          abonne.next(url);
        }
        abonne.complete();
      },
      error: err => {
        fermer();
        abonne.error(err);
      },
    });
    return () => lecture.unsubscribe();
  });
}
