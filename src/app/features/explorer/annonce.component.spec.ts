import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AnnonceComponent } from './annonce.component';
import { BienService } from '../biens/services/bien.service';
import { JuridictionService } from '../biens/services/juridiction.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { LogementContextService } from '../../core/services/logement-context.service';
import { BienDTO } from '../biens/models/bien.model';

const PUBLIC = {
  id: 2, titre: 'Appartement T3', typeBien: 'APPARTEMENT', adresse: '52 rue de la République', ville: 'Lyon',
  codePostal: '69006', pays: 'FR', loyerMensuel: 965, chargesMensuelles: 120, devise: 'EUR', meuble: false,
  colocation: false, disponibleDe: '2026-11-12', images: [], proprietaire: { firstName: 'Claire', lastName: 'M..' },
} as unknown as BienDTO;

function creer(options: { connecte: number | null; aDesBiens: boolean; prive?: 'ok' | 'erreur'; proprietaireId?: number }) {
  const getPrive = jasmine.createSpy('getPrive').and.callFake(() => options.prive === 'erreur'
    ? throwError(() => ({ status: 403 }))
    : of({ ...PUBLIC, proprietaire: { id: options.proprietaireId ?? 7, firstName: 'Claire', lastName: 'Martin' } }));
  TestBed.configureTestingModule({
    imports: [AnnonceComponent],
    providers: [
      provideRouter([]),
      { provide: BienService, useValue: { getPublic: () => of(PUBLIC), getPrive } },
      { provide: JuridictionService, useValue: { configuration: () => throwError(() => new Error()) } },
      { provide: AuthService, useValue: { currentUser: signal(options.connecte ? { id: options.connecte } : null) } },
      { provide: LogementContextService, useValue: { aDesBiens: signal(options.aDesBiens) } },
    ],
  });
  const f = TestBed.createComponent(AnnonceComponent);
  f.componentRef.setInput('id', '2');
  f.detectChanges();
  f.detectChanges();
  return { f, getPrive, el: f.nativeElement as HTMLElement };
}

describe('AnnonceComponent', () => {
  it('visiteur : « Contacter », aucune lecture de la vue privée', () => {
    const { getPrive, el } = creer({ connecte: null, aDesBiens: false });
    expect(getPrive).not.toHaveBeenCalled();
    expect(el.querySelector('.banniere')).toBeNull();
    expect(el.textContent).toContain('Contacter');
    expect(el.textContent).toContain('Claire M.');
  });

  it('compte sans bien (candidat, locataire) : aucune lecture de la vue privée', () => {
    const { getPrive } = creer({ connecte: 7, aDesBiens: false });
    expect(getPrive).not.toHaveBeenCalled();
  });

  it('propriétaire de l’annonce : bannière et « Voir les messages reçus » à la place de « Contacter »', () => {
    const { f, getPrive, el } = creer({ connecte: 7, aDesBiens: true, prive: 'ok', proprietaireId: 7 });
    expect(getPrive).toHaveBeenCalledOnceWith(2);
    expect(f.componentInstance.estProprietaire()).toBeTrue();
    expect(el.querySelector('.banniere')?.textContent).toContain('C’est votre annonce');
    expect(el.querySelector('a[href="/biens/2/modifier"]')).not.toBeNull();
    expect(el.querySelector('.carte-contact')?.textContent).toContain('Voir les messages reçus');
    expect(el.querySelector('.carte-contact button.kp-btn--primary')).toBeNull();
  });

  it('propriétaire d’autres biens : 403 ignoré, annonce publique inchangée', () => {
    const { f, el } = creer({ connecte: 7, aDesBiens: true, prive: 'erreur' });
    expect(f.componentInstance.estProprietaire()).toBeFalse();
    expect(el.querySelector('.banniere')).toBeNull();
  });

  it('vue privée d’un autre propriétaire : pas de bannière', () => {
    const { f } = creer({ connecte: 7, aDesBiens: true, prive: 'ok', proprietaireId: 99 });
    expect(f.componentInstance.estProprietaire()).toBeFalse();
  });
});
