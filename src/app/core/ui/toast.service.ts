import { Injectable, signal } from '@angular/core';

export type TonToast = 'info' | 'ok' | 'erreur';

export interface Toast {
  id: number;
  texte: string;
  ton: TonToast;
  action?: { libelle: string; executer: () => void };
}

/** Messages éphémères au-dessus de la barre d'onglets : confirmation d'une action, erreur réseau. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private suivant = 1;

  afficher(texte: string, options: { ton?: TonToast; duree?: number; action?: Toast['action'] } = {}): void {
    const toast: Toast = { id: this.suivant++, texte, ton: options.ton ?? 'info', action: options.action };
    this.toasts.update(liste => [...liste.slice(-2), toast]);
    setTimeout(() => this.fermer(toast.id), options.duree ?? (toast.action ? 6000 : 4000));
  }

  ok(texte: string): void {
    this.afficher(texte, { ton: 'ok' });
  }

  erreur(texte: string): void {
    this.afficher(texte, { ton: 'erreur', duree: 6000 });
  }

  fermer(id: number): void {
    this.toasts.update(liste => liste.filter(t => t.id !== id));
  }
}
