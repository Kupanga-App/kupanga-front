import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { QuittanceService } from './quittance.service';
import { environment } from '../../../../environments/environment';

describe('QuittanceService (C8-bis)', () => {
  let service: QuittanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(QuittanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('marquer payée envoie signature, mode, date et référence', () => {
    service.marquerPayee(4, {
      signatureBase64: 'sig', modePaiement: 'MOBILE_MONEY', datePaiement: '2026-10-05', referencePaiement: 'MP-1',
    }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/quittances/4/marquer-payee`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      signatureBase64: 'sig', modePaiement: 'MOBILE_MONEY', datePaiement: '2026-10-05', referencePaiement: 'MP-1',
    });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('joindre le reçu envoie la photo en multipart dans la partie « recu »', () => {
    const photo = new File([new Uint8Array([1, 2])], 'recu.jpg', { type: 'image/jpeg' });
    service.ajouterRecu(4, photo).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/quittances/4/recu`);
    expect(req.request.body instanceof FormData).toBeTrue();
    expect((req.request.body as FormData).get('recu')).toBe(photo);
    req.flush({ id: 4 });
  });
});
