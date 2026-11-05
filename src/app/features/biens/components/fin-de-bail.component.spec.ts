import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { BienDTO } from '../models/bien.model';
import { FinDeBailComponent } from './fin-de-bail.component';

function dans(jours: number): string {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const bien = (location: Partial<NonNullable<BienDTO['location']>> | null) =>
  ({ id: 4, devise: 'EUR', location: location ? { id: 9, dateDebut: null, dateFinPrevue: null, congeDonnePar: null, depotGarantie: 700, ...location } : null }) as unknown as BienDTO;

describe('FinDeBailComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FinDeBailComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const rendre = (b: BienDTO, cote: 'proprietaire' | 'locataire') => {
    const f = TestBed.createComponent(FinDeBailComponent);
    f.componentRef.setInput('bien', b);
    f.componentRef.setInput('cote', cote);
    f.detectChanges();
    return f;
  };
  const texte = (f: ReturnType<typeof rendre>) => (f.nativeElement as HTMLElement).textContent ?? '';

  it('sans congé : bouton « Donner congé » (locataire) ou « Mettre fin au bail » (propriétaire)', () => {
    expect(texte(rendre(bien({}), 'locataire'))).toContain('Donner congé');
    expect(texte(rendre(bien({}), 'proprietaire'))).toContain('Mettre fin au bail');
  });

  it('congé du locataire : le propriétaire ne peut pas le retirer, et termine seulement le jour venu', () => {
    const futur = rendre(bien({ dateFinPrevue: dans(5), congeDonnePar: 'LOCATAIRE' }), 'proprietaire');
    expect(texte(futur)).not.toContain('Retirer le congé');
    expect(futur.componentInstance.dateAtteinte()).toBeFalse();

    const echu = rendre(bien({ dateFinPrevue: dans(0), congeDonnePar: 'LOCATAIRE' }), 'proprietaire');
    expect(echu.componentInstance.dateAtteinte()).toBeTrue();
    expect(texte(rendre(bien({ dateFinPrevue: dans(5), congeDonnePar: 'LOCATAIRE' }), 'locataire'))).toContain('Retirer le congé');
  });

  it('fin du bail : montant ≤ dépôt, motif exigé en cas de retenue, puis POST /terminer', () => {
    const f = rendre(bien({ dateFinPrevue: dans(0), congeDonnePar: 'PROPRIETAIRE' }), 'proprietaire');
    const c = f.componentInstance;
    c.ouvrirFin();
    expect(c.depotRestitue).toBe(700);
    expect(c.finValide()).toBeTrue();
    c.depotRestitue = 701;
    expect(c.finValide()).toBeFalse();
    c.depotRestitue = 500;
    expect(c.finValide()).toBeFalse();
    c.motifRetenue = 'Peinture';
    expect(c.finValide()).toBeTrue();

    c.terminer();
    const req = http.expectOne(`${environment.apiUrl}/locations/9/terminer`);
    expect(req.request.body).toEqual({ depotRestitue: 500, motifRetenue: 'Peinture' });
    req.flush({ id: 9, statut: 'TERMINEE' });
  });
});
