import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfidentialiteComponent } from './confidentialite.component';
import { ConditionsComponent } from './conditions.component';
import { routes } from '../../app.routes';
import { libelleACompleter } from './champ-editeur.component';

describe('Pages légales', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('affiche la politique de confidentialité avec la mention Google « Limited Use »', () => {
    const fixture = TestBed.createComponent(ConfidentialiteComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Politique de confidentialité');
    expect(el.textContent).toContain('Limited Use');
    expect(el.querySelectorAll('table').length).toBe(2);
  });

  it('affiche les conditions et un lien interne vers la confidentialité', () => {
    const fixture = TestBed.createComponent(ConditionsComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain("Conditions d'utilisation");
    const liens = Array.from(el.querySelectorAll('a')).map(a => a.getAttribute('href'));
    expect(liens).toContain('/confidentialite');
    expect(liens.some(h => h?.includes('github.com'))).toBeFalse();
  });

  it('surligne les informations de l’éditeur encore à compléter', () => {
    const fixture = TestBed.createComponent(ConfidentialiteComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('mark.kp-legal__a-completer').length).toBeGreaterThan(0);
  });

  it('nomme ce qui reste à compléter dans les badges', () => {
    expect(libelleACompleter('[ADRESSE À COMPLÉTER]')).toBe('adresse');
    expect(libelleACompleter('[À COMPLÉTER : nom et pays de l’hébergeur]')).toBe('nom et pays de l’hébergeur');
    expect(libelleACompleter('[NOM OU RAISON SOCIALE À COMPLÉTER]')).toBe('nom ou raison sociale');
  });

  it('construit un sommaire à partir des sections numérotées', async () => {
    const fixture = TestBed.createComponent(ConditionsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const liens = fixture.nativeElement.querySelectorAll('.kp-legal__sommaire a');
    expect(liens.length).toBe(10);
    expect(liens[0].textContent).toContain('Objet');
  });

  it('déclare les deux routes publiques, sans garde', () => {
    for (const chemin of ['confidentialite', 'conditions']) {
      const route = routes.find(r => r.path === chemin);
      expect(route).withContext(chemin).toBeDefined();
      expect(route?.canActivate).toBeUndefined();
    }
  });
});
