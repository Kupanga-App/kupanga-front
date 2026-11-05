import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { LocationService } from './location.service';
import { Location } from '../models/location.model';
import { locataireDuBail } from '../models/bien.model';

describe('LocationService', () => {
  let service: LocationService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(LocationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('duBien : null quand le bien est libre (204)', () => {
    let resultat: Location | null | undefined;
    service.duBien(4).subscribe(l => (resultat = l));
    http.expectOne(`${api}/biens/4/location`).flush(null, { status: 204, statusText: 'No Content' });
    expect(resultat).toBeNull();
  });

  it('duBien : la réservation en cours', () => {
    let resultat: Location | null | undefined;
    service.duBien(4).subscribe(l => (resultat = l));
    http.expectOne(`${api}/biens/4/location`).flush({ id: 9, statut: 'RESERVEE' });
    expect(resultat?.statut).toBe('RESERVEE');
  });

  it('désistement et retrait : POST sur la location', () => {
    service.desister(9).subscribe();
    service.annuler(9).subscribe();
    expect(http.expectOne(`${api}/locations/9/desister`).request.method).toBe('POST');
    expect(http.expectOne(`${api}/locations/9/annuler`).request.method).toBe('POST');
  });

  it('mesReservations : GET', () => {
    service.mesReservations().subscribe();
    expect(http.expectOne(`${api}/locations/reservations`).request.method).toBe('GET');
  });
});

describe('locataireDuBail', () => {
  const candidat = { id: 2, firstName: 'Lea', lastName: 'Loc', mail: 'lea@test.fr' };
  const actuel = { id: 3, firstName: 'Max', lastName: 'Loc', mail: 'max@test.fr' };

  it('locataire actuel en priorité, sinon candidat qui a réservé, sinon personne', () => {
    const reservation = { id: 1, locataire: candidat, dateReservation: '', dateExpiration: '' };
    expect(locataireDuBail({ locataire: actuel, reservation } as never)?.id).toBe(3);
    expect(locataireDuBail({ reservation } as never)?.id).toBe(2);
    expect(locataireDuBail({} as never)).toBeNull();
    expect(locataireDuBail(null)).toBeNull();
  });
});
