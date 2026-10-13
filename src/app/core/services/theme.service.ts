import { Injectable, signal } from '@angular/core';

/** Thème de l'interface : celui du système par défaut, ou forcé depuis le compte. */
export type ChoixTheme = 'systeme' | 'clair' | 'sombre';

const CLE = 'kp_theme';

export const LIBELLES_THEME: Record<ChoixTheme, string> = {
  systeme: 'Comme l’appareil',
  clair: 'Clair',
  sombre: 'Sombre',
};

/**
 * Pose `data-theme` sur `<html>` (lu par les jetons de `styles/_theme.scss`). Sans attribut, le thème suit
 * `prefers-color-scheme`. Le choix est relu par `index.html` avant le premier rendu.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly choix = signal<ChoixTheme>(lire());

  constructor() {
    appliquer(this.choix());
  }

  choisir(choix: ChoixTheme): void {
    this.choix.set(choix);
    appliquer(choix);
    try {
      if (choix === 'systeme') {
        localStorage.removeItem(CLE);
      } else {
        localStorage.setItem(CLE, choix === 'sombre' ? 'dark' : 'light');
      }
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour cette visite
    }
  }
}

function lire(): ChoixTheme {
  try {
    const valeur = localStorage.getItem(CLE);
    if (valeur === 'dark') return 'sombre';
    if (valeur === 'light') return 'clair';
  } catch {
    // Stockage indisponible
  }
  return 'systeme';
}

function appliquer(choix: ChoixTheme): void {
  const racine = document.documentElement;
  if (choix === 'systeme') {
    racine.removeAttribute('data-theme');
  } else {
    racine.setAttribute('data-theme', choix === 'sombre' ? 'dark' : 'light');
  }
}
