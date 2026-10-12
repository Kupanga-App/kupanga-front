import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { JuridictionService } from './juridiction.service';
import { JuridictionConfig, champObligatoire, champVisible } from '../models/juridiction.model';
import { environment } from '../../../../environments/environment';

const RDC: JuridictionConfig = {
  pays: 'CD', libelle: 'République démocratique du Congo', devises: ['USD', 'CDF'], deviseDefaut: 'USD',
  champsObligatoires: ['commune', 'quartier'], champsMasques: ['classeEnergie', 'classeGes', 'codePostal'],
  typesBien: ['APPARTEMENT', 'MAISON', 'STUDIO'], canauxNotification: ['EMAIL', 'WHATSAPP_LIEN'],
  modesPaiement: ['ESPECES', 'MOBILE_MONEY', 'VIREMENT', 'AUTRE'], equipements: ['FORAGE'], compteursEdl: ['CASH_POWER'],
};

describe('JuridictionService (J6)', () => {
  let service: JuridictionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(JuridictionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ne demande la configuration d’un pays qu’une fois', () => {
    let recu: JuridictionConfig | undefined;
    service.configuration('CD').subscribe(c => (recu = c));
    service.configuration('CD').subscribe();
    http.expectOne(`${environment.apiUrl}/juridictions/CD`).flush(RDC);

    expect(recu?.deviseDefaut).toBe('USD');
  });

  it('redemande après une erreur (pays non pris en charge ou réseau)', () => {
    service.configuration('BE').subscribe({ error: () => undefined });
    http.expectOne(`${environment.apiUrl}/juridictions/BE`).flush('', { status: 404, statusText: 'Not Found' });

    service.configuration('BE').subscribe({ error: () => undefined });
    http.expectOne(`${environment.apiUrl}/juridictions/BE`).flush('', { status: 404, statusText: 'Not Found' });
  });

  it('champs visibles et obligatoires selon la configuration ; tout visible tant qu’elle n’est pas chargée', () => {
    expect(champVisible(RDC, 'codePostal')).toBeFalse();
    expect(champVisible(RDC, 'quartier')).toBeTrue();
    expect(champObligatoire(RDC, 'commune')).toBeTrue();
    expect(champObligatoire(RDC, 'avenue')).toBeFalse();
    expect(champVisible(null, 'codePostal')).toBeTrue();
    expect(champObligatoire(null, 'codePostal')).toBeFalse();
  });
});
