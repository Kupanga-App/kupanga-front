import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DemandeLocationService } from './demande-location.service';
import { echeance, statutDemande } from '../models/demande-location.model';
import { environment } from '../../../../environments/environment';

describe('DemandeLocationService', () => {
  let service: DemandeLocationService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DemandeLocationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('propriétaire : envoie, liste et retire une demande', () => {
    service.envoyer(10, 2).subscribe();
    expect(http.expectOne(`${api}/biens/10/demandes-location/2`).request.method).toBe('POST');

    service.duBien(10).subscribe();
    expect(http.expectOne(`${api}/biens/10/demandes-location`).request.method).toBe('GET');

    service.annuler(50).subscribe();
    expect(http.expectOne(`${api}/demandes-location/50`).request.method).toBe('DELETE');
  });

  it('locataire : liste les demandes reçues, accepte et refuse', () => {
    service.recues().subscribe();
    expect(http.expectOne(`${api}/demandes-location/recues`).request.method).toBe('GET');

    service.accepter(50).subscribe();
    expect(http.expectOne(`${api}/demandes-location/50/accepter`).request.method).toBe('POST');

    service.refuser(51).subscribe();
    expect(http.expectOne(`${api}/demandes-location/51/refuser`).request.method).toBe('POST');
  });
});

describe('demande-location.model', () => {
  it('libellés et tons des statuts', () => {
    expect(statutDemande('EN_ATTENTE')).toEqual({ libelle: 'En attente de réponse', ton: 'attention' });
    expect(statutDemande('ACCEPTEE').ton).toBe('ok');
    expect(statutDemande('REFUSEE').ton).toBe('danger');
    expect(statutDemande('EXPIREE').libelle).toBe('Expirée');
  });

  it('échéance lisible en français, vide si absente ou invalide', () => {
    expect(echeance('2026-11-06T09:05:00')).toBe('6 novembre à 9 h 05');
    expect(echeance(null)).toBe('');
    expect(echeance('pas une date')).toBe('');
  });
});
