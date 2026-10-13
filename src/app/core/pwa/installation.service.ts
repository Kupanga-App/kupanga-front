import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/** Événement `beforeinstallprompt` de Chrome et Edge (Android et ordinateur), absent des types du DOM. */
export interface EvenementInstallation extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    /** Événement capté par `index.html` s'il arrive avant le démarrage d'Angular. */
    __kpInstallation?: EvenementInstallation;
  }
}

/** Date du dernier « Plus tard » (ms), propre à cet appareil. */
export const CLE_REFUS_INSTALLATION = 'kp_installation_refus';

/** Après « Plus tard », le bandeau ne revient pas avant 14 jours. */
export const DELAI_RELANCE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * - `natif` : Chrome ou Edge (Android, ordinateur) proposent leur fenêtre d'installation ;
 * - `ios` : iPhone ou iPad, sans fenêtre d'installation : on explique « Partager → Sur l'écran d'accueil ».
 */
export type ModeInstallation = 'natif' | 'ios';

function estIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function dejaInstallee(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function refusRecent(): boolean {
  try {
    const date = Number(localStorage.getItem(CLE_REFUS_INSTALLATION));
    return date > 0 && Date.now() - date < DELAI_RELANCE_MS;
  } catch {
    return false;
  }
}

/**
 * Bandeau « Installer l'application » proposé dès la visite du site, sur téléphone et sur ordinateur.
 * Jamais affiché dans l'application déjà installée, ni pendant 14 jours après « Plus tard ».
 * Firefox et Safari sur ordinateur n'offrent pas d'installation : rien n'est proposé.
 */
@Injectable({ providedIn: 'root' })
export class InstallationService {
  private evenement: EvenementInstallation | null = window.__kpInstallation ?? null;

  private readonly mode = signal<ModeInstallation | null>(
    dejaInstallee() ? null : this.evenement ? 'natif' : estIos() ? 'ios' : null,
  );
  private readonly masque = signal(refusRecent());

  /** Mode du bandeau à afficher, ou `null` s'il ne faut rien proposer. */
  readonly proposition = computed(() => this.masque() ? null : this.mode());

  constructor() {
    const surProposition = (e: Event) => {
      // Garde l'événement pour l'ouvrir au clic sur « Installer » (sinon Chrome affiche sa propre mini-barre)
      e.preventDefault();
      this.evenement = e as EvenementInstallation;
      if (!dejaInstallee()) {
        this.mode.set('natif');
      }
    };
    const surInstallation = () => {
      this.evenement = null;
      this.mode.set(null);
    };
    window.addEventListener('beforeinstallprompt', surProposition);
    window.addEventListener('appinstalled', surInstallation);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('beforeinstallprompt', surProposition);
      window.removeEventListener('appinstalled', surInstallation);
    });
  }

  /** Ouvre la fenêtre d'installation du navigateur (mode `natif`). */
  async installer(): Promise<void> {
    const evenement = this.evenement;
    if (!evenement) {
      return;
    }
    // Un événement ne peut ouvrir la fenêtre qu'une fois
    this.evenement = null;
    window.__kpInstallation = undefined;
    this.mode.set(null);
    await evenement.prompt();
    const { outcome } = await evenement.userChoice;
    if (outcome === 'dismissed') {
      this.plusTard();
    }
  }

  /** Masque le bandeau pour 14 jours sur cet appareil. */
  plusTard(): void {
    this.masque.set(true);
    try {
      localStorage.setItem(CLE_REFUS_INSTALLATION, String(Date.now()));
    } catch {
      // Stockage indisponible (navigation privée) : masqué jusqu'au rechargement seulement
    }
  }
}
