import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { LogementContextService, biensPossedes, logementsLoues } from './logement-context.service';
import { BienDTO } from '../../features/biens/models/bien.model';

const bien = (id: number, proprietaireId: number, locataireId?: number, archive = false) =>
  ({ id, archive, proprietaire: { id: proprietaireId }, locataire: locataireId ? { id: locataireId } : undefined }) as unknown as BienDTO;

describe('LogementContextService (lot 3)', () => {
  let service: LogementContextService;
  let http: HttpTestingController;

  beforeEach(() => {
    try { localStorage.clear(); } catch { /* indisponible */ }
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(LogementContextService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sépare les biens possédés et les logements loués d’un même compte', () => {
    const biens = [bien(1, 5), bien(2, 9, 5), bien(3, 5, 8)];
    expect(biensPossedes(biens, 5).map(b => b.id)).toEqual([1, 3]);
    expect(logementsLoues(biens, 5).map(b => b.id)).toEqual([2]);
    expect(biensPossedes(biens, null)).toEqual([]);
  });

  it('charger : garde le nombre de biens possédés non archivés, tiré de la même réponse (aucun autre appel)', () => {
    expect(service.nombreBiens()).toBeNull();
    service.charger(5).subscribe();
    http.expectOne(`${environment.apiUrl}/users/biens`).flush([bien(1, 5), bien(3, 5, 8), bien(6, 5, undefined, true), bien(2, 9, 5)]);

    expect(service.nombreBiens()).toBe(2);
    service.charger(5).subscribe();
    http.expectNone(`${environment.apiUrl}/users/biens`);

    service.clear();
    expect(service.nombreBiens()).toBeNull();
  });

  it('charger : propriétaire qui loue aussi → aDesBiens et logement (non archivé en priorité)', () => {
    let logement: number | null | undefined;
    service.charger(5).subscribe(id => (logement = id));
    http.expectOne(`${environment.apiUrl}/users/biens`).flush([bien(1, 5), bien(2, 9, 5, true), bien(4, 7, 5)]);

    expect(logement).toBe(4);
    expect(service.aDesBiens()).toBeTrue();
    expect(service.hasLogement()).toBeTrue();
  });

  it('charger : un bien possédé loué à quelqu’un d’autre n’est pas « mon logement »', () => {
    service.charger(5).subscribe();
    http.expectOne(`${environment.apiUrl}/users/biens`).flush([bien(1, 5, 8)]);
    expect(service.hasLogement()).toBeFalse();
    expect(service.aDesBiens()).toBeTrue();
  });

  it('clear : tout est oublié (déconnexion)', () => {
    service.setADesBiens(true);
    service.set(3);
    service.clear();
    expect(service.aDesBiens()).toBeFalse();
    expect(service.hasLogement()).toBeFalse();
  });
});
