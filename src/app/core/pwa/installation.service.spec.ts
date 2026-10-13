import { TestBed } from '@angular/core/testing';
import {
  CLE_REFUS_INSTALLATION, DELAI_RELANCE_MS, EvenementInstallation, InstallationService,
} from './installation.service';

/** Faux `beforeinstallprompt` de Chrome. */
function fauxEvenement(choix: 'accepted' | 'dismissed'): EvenementInstallation & { ouvert: number } {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as EvenementInstallation & { ouvert: number };
  e.ouvert = 0;
  Object.assign(e, {
    prompt: async () => { e.ouvert++; },
    userChoice: Promise.resolve({ outcome: choix }),
  });
  return e;
}

describe('Bandeau « Installer l’application »', () => {
  afterEach(() => {
    localStorage.clear();
    window.__kpInstallation = undefined;
  });

  function service(): InstallationService {
    return TestBed.inject(InstallationService);
  }

  it('ne propose rien tant que le navigateur ne permet pas l’installation (Firefox, Safari sur ordinateur)', () => {
    expect(service().proposition()).toBeNull();
  });

  it('propose l’installation quand Chrome ou Edge l’annonce, et garde son événement', () => {
    const s = service();
    const e = fauxEvenement('accepted');
    window.dispatchEvent(e);

    expect(e.defaultPrevented).toBeTrue();
    expect(s.proposition()).toBe('natif');
  });

  it('reprend l’annonce captée par index.html avant le démarrage d’Angular', () => {
    window.__kpInstallation = fauxEvenement('accepted');
    expect(service().proposition()).toBe('natif');
  });

  it('« Installer » ouvre la fenêtre du navigateur une seule fois puis retire le bandeau', async () => {
    const s = service();
    const e = fauxEvenement('accepted');
    window.dispatchEvent(e);

    await s.installer();
    await s.installer();

    expect(e.ouvert).toBe(1);
    expect(s.proposition()).toBeNull();
    expect(localStorage.getItem(CLE_REFUS_INSTALLATION)).toBeNull();
  });

  it('un refus dans la fenêtre du navigateur vaut « Plus tard »', async () => {
    const s = service();
    window.dispatchEvent(fauxEvenement('dismissed'));

    await s.installer();

    expect(localStorage.getItem(CLE_REFUS_INSTALLATION)).not.toBeNull();
  });

  it('« Plus tard » masque le bandeau, y compris si le navigateur l’annonce de nouveau', () => {
    const s = service();
    window.dispatchEvent(fauxEvenement('accepted'));

    s.plusTard();
    window.dispatchEvent(fauxEvenement('accepted'));

    expect(s.proposition()).toBeNull();
  });

  it('reste masqué 14 jours après « Plus tard », puis revient', () => {
    localStorage.setItem(CLE_REFUS_INSTALLATION, String(Date.now() - DELAI_RELANCE_MS + 60_000));
    window.__kpInstallation = fauxEvenement('accepted');
    expect(service().proposition()).toBeNull();

    TestBed.resetTestingModule();
    localStorage.setItem(CLE_REFUS_INSTALLATION, String(Date.now() - DELAI_RELANCE_MS - 60_000));
    expect(service().proposition()).toBe('natif');
  });

  it('disparaît une fois l’application installée', () => {
    const s = service();
    window.dispatchEvent(fauxEvenement('accepted'));

    window.dispatchEvent(new Event('appinstalled'));

    expect(s.proposition()).toBeNull();
  });
});
