import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ChampDateComponent } from './champ-date.component';
import { ChampHeureComponent } from './champ-heure.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ChampDateComponent, ChampHeureComponent],
  template: `
    <kp-champ-date idChamp="d" [formControl]="date" min="2026-11-05" max="2026-11-20" [effacable]="true" />
    <kp-champ-heure idChamp="h" [formControl]="heure" [effacable]="true" />
  `,
})
class HoteComponent {
  readonly date = new FormControl('2026-11-08', { nonNullable: true });
  readonly heure = new FormControl('', { nonNullable: true });
}

describe('kp-champ-date et kp-champ-heure', () => {
  let fixture: ComponentFixture<HoteComponent>;
  let hote: HoteComponent;
  const el = () => fixture.nativeElement as HTMLElement;
  const jour = (iso: string) => el().querySelector<HTMLButtonElement>(`.jour[data-iso="${iso}"]`)!;
  /** Option de la liste des heures (et non un jour du calendrier). */
  const option = (texte: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('kp-champ-heure .option')].find(b => b.textContent?.trim() === texte)!;

  beforeEach(() => {
    fixture = TestBed.createComponent(HoteComponent);
    hote = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('affiche la date du formulaire en clair, sur un bouton relié au label', () => {
    const d = el().querySelector<HTMLButtonElement>('#d')!;
    expect(d.textContent).toContain('8 novembre 2026');
  });

  it('choisir un jour renvoie « AAAA-MM-JJ » au formulaire ; les jours hors bornes sont refusés', () => {
    el().querySelector<HTMLButtonElement>('#d')!.click();
    fixture.detectChanges();

    expect(jour('2026-11-04').getAttribute('aria-disabled')).toBe('true');
    jour('2026-11-04').click();
    expect(hote.date.value).toBe('2026-11-08');

    jour('2026-11-12').click();
    fixture.detectChanges();
    expect(hote.date.value).toBe('2026-11-12');
    expect(hote.date.touched).toBeTrue();
  });

  it('« Effacer » vide le champ facultatif', () => {
    el().querySelector<HTMLButtonElement>('#d')!.click();
    fixture.detectChanges();
    el().querySelectorAll<HTMLButtonElement>('.pied .lien')[1].click();
    expect(hote.date.value).toBe('');
  });

  it('suit la valeur écrite par le formulaire et l’état désactivé', () => {
    hote.date.setValue('2026-11-20');
    hote.date.disable();
    fixture.detectChanges();
    const d = el().querySelector<HTMLButtonElement>('#d')!;
    expect(d.textContent).toContain('20 novembre 2026');
    expect(d.disabled).toBeTrue();
  });

  it('heure : « HH:mm » à partir de l’heure puis des minutes', () => {
    el().querySelector<HTMLButtonElement>('#h')!.click();
    fixture.detectChanges();
    option('14').click();
    fixture.detectChanges();
    expect(hote.heure.value).toBe('14:00');
    option('35').click();
    fixture.detectChanges();
    expect(hote.heure.value).toBe('14:35');
    expect(el().querySelector('#h')!.textContent).toContain('14 h 35');
  });
});
