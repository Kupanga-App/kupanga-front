import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { SortieProtegee, sortieAssistantGuard } from './sortie-assistant.guard';

describe('sortieAssistantGuard', () => {
  const garde = (ecran: SortieProtegee | null) =>
    sortieAssistantGuard(ecran as SortieProtegee, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot);

  it('laisse partir un écran qui le permet', () => {
    expect(garde({ peutQuitter: () => true })).toBeTrue();
  });

  it('retient la sortie tant que l’écran répond non', async () => {
    expect(await garde({ peutQuitter: () => Promise.resolve(false) })).toBeFalse();
    expect(await garde({ peutQuitter: () => Promise.resolve(true) })).toBeTrue();
  });

  it('sans écran (composant non créé) : sortie permise', () => {
    expect(garde(null)).toBeTrue();
  });
});
