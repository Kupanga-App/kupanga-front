import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfidentialiteComponent } from './confidentialite.component';
import { ConditionsComponent } from './conditions.component';
import { routes } from '../../app.routes';

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

  it('déclare les deux routes publiques, sans garde', () => {
    for (const chemin of ['confidentialite', 'conditions']) {
      const route = routes.find(r => r.path === chemin);
      expect(route).withContext(chemin).toBeDefined();
      expect(route?.canActivate).toBeUndefined();
    }
  });
});
