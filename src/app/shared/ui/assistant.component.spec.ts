import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssistantComponent } from './assistant.component';

@Component({
  standalone: true,
  imports: [AssistantComponent],
  template: `
    <kp-assistant titre="Nouveau bail" [etapes]="['Début', 'Loyer', 'Vérification']" [etape]="etape()"
                  [peutContinuer]="peutContinuer()" [manque]="manque()" [modifie]="modifie()"
                  (quitter)="quittes = quittes + 1" (suivant)="suivants = suivants + 1">
      <p>Contenu</p>
    </kp-assistant>
  `,
})
class HoteComponent {
  readonly assistant = viewChild.required(AssistantComponent);
  readonly etape = signal(0);
  readonly peutContinuer = signal(false);
  readonly manque = signal<string | null>('Indiquez le loyer hors charges.');
  readonly modifie = signal(false);
  quittes = 0;
  suivants = 0;
}

describe('AssistantComponent (kp-assistant)', () => {
  let fixture: ComponentFixture<HoteComponent>;
  let hote: HoteComponent;
  const el = () => fixture.nativeElement as HTMLElement;
  const bouton = (texte: string) =>
    [...el().querySelectorAll('button')].find(b => b.textContent?.trim() === texte) as HTMLButtonElement | undefined;
  const fermer = () => el().querySelector<HTMLButtonElement>('.haut .fermer')!;

  beforeEach(() => {
    fixture = TestBed.createComponent(HoteComponent);
    hote = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // La fenêtre de confirmation bloque le défilement de la page tant qu'elle est ouverte
    document.body.style.overflow = '';
  });

  it('dit ce qui manque près de « Continuer » grisé', () => {
    expect(bouton('Continuer')?.disabled).toBeTrue();
    expect(el().querySelector('.manque')?.textContent).toContain('Indiquez le loyer hors charges.');
    expect(bouton('Continuer')?.getAttribute('aria-describedby')).toBe('kp-assistant-manque');
  });

  it('ne montre plus le manque quand on peut continuer', () => {
    hote.peutContinuer.set(true);
    fixture.detectChanges();

    expect(bouton('Continuer')?.disabled).toBeFalse();
    expect(el().querySelector('.manque')).toBeNull();
    bouton('Continuer')!.click();
    expect(hote.suivants).toBe(1);
  });

  it('« Quitter » sans saisie : sortie immédiate', () => {
    fermer().click();
    fixture.detectChanges();

    expect(hote.quittes).toBe(1);
    expect(el().querySelector('[role="dialog"]')).toBeNull();
  });

  it('« Quitter » après saisie : confirmation, et sortie seulement si on confirme', () => {
    hote.modifie.set(true);
    fixture.detectChanges();

    fermer().click();
    fixture.detectChanges();
    expect(hote.quittes).toBe(0);
    expect(el().querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Quitter sans enregistrer ?');

    bouton('Continuer la saisie')!.click();
    fixture.detectChanges();
    expect(hote.quittes).toBe(0);
    expect(el().querySelector('[role="dialog"]')).toBeNull();

    fermer().click();
    fixture.detectChanges();
    bouton('Quitter')!.click();
    fixture.detectChanges();
    expect(hote.quittes).toBe(1);
    expect(el().querySelector('[role="dialog"]')).toBeNull();
  });

  it('dernière étape : libellé de fin', () => {
    hote.etape.set(2);
    fixture.detectChanges();
    expect(bouton('Valider')).toBeDefined();
    expect(bouton('Retour')).toBeDefined();
  });

  describe('confirmerSortie (retour du navigateur)', () => {
    it('sans saisie : sortie permise sans fenêtre', async () => {
      expect(await hote.assistant().confirmerSortie()).toBeTrue();
      fixture.detectChanges();
      expect(el().querySelector('[role="dialog"]')).toBeNull();
    });

    it('après saisie : « Continuer la saisie » retient la sortie', async () => {
      hote.modifie.set(true);
      fixture.detectChanges();

      const reponse = hote.assistant().confirmerSortie();
      fixture.detectChanges();
      expect(el().querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Quitter sans enregistrer ?');

      bouton('Continuer la saisie')!.click();
      fixture.detectChanges();
      expect(await reponse).toBeFalse();
      expect(el().querySelector('[role="dialog"]')).toBeNull();
    });

    it('après saisie : « Quitter » laisse partir, sans émettre un second `quitter`', async () => {
      hote.modifie.set(true);
      fixture.detectChanges();

      const reponse = hote.assistant().confirmerSortie();
      fixture.detectChanges();
      bouton('Quitter')!.click();
      fixture.detectChanges();

      expect(await reponse).toBeTrue();
      expect(hote.quittes).toBe(0);
    });

    it('fenêtre fermée par ✕ : la sortie est annulée', async () => {
      hote.modifie.set(true);
      fixture.detectChanges();

      const reponse = hote.assistant().confirmerSortie();
      fixture.detectChanges();
      el().querySelector<HTMLButtonElement>('[role="dialog"] .fermer')!.click();
      fixture.detectChanges();

      expect(await reponse).toBeFalse();
    });
  });
});
