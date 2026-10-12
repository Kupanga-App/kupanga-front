import { HttpErrorResponse } from '@angular/common/http';
import { messageErreurApi, messageLienSignature } from './api-error';

describe('messageErreurApi', () => {
  it('lit le message de l’API (corps JSON)', () => {
    const err = new HttpErrorResponse({ status: 409, error: { status: 409, message: 'Ce bien est archivé' } });
    expect(messageErreurApi(err, 'défaut')).toBe('Ce bien est archivé');
  });

  it('lit le message quand le corps est une chaîne JSON (responseType text)', () => {
    const err = new HttpErrorResponse({ status: 400, error: '{"message":"Lien de confirmation invalide ou expiré"}' });
    expect(messageErreurApi(err, 'défaut')).toBe('Lien de confirmation invalide ou expiré');
  });

  it('préfère le premier message de champ en cas d’erreur de validation', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { message: 'Erreur de validation', validationErrors: { password: 'Le mot de passe doit contenir…' } },
    });
    expect(messageErreurApi(err, 'défaut')).toBe('Le mot de passe doit contenir…');
  });

  it('explique une coupure réseau (status 0, ex. fichier trop gros coupé par le serveur)', () => {
    const err = new HttpErrorResponse({ status: 0 });
    expect(messageErreurApi(err, 'défaut')).toContain('Connexion impossible');
  });

  it('donne un message pour 429 et 413 sans corps, sinon le message par défaut', () => {
    expect(messageErreurApi(new HttpErrorResponse({ status: 429 }), 'défaut')).toContain('Trop de tentatives');
    expect(messageErreurApi(new HttpErrorResponse({ status: 413 }), 'défaut')).toContain('10 Mo');
    expect(messageErreurApi(new HttpErrorResponse({ status: 500, error: 'texte brut' }), 'défaut')).toBe('défaut');
    expect(messageErreurApi(new Error('x'), 'défaut')).toBe('défaut');
  });
});

describe('messageLienSignature', () => {
  it('distingue lien invalide (404), lien expiré (410) et document figé (409)', () => {
    expect(messageLienSignature(new HttpErrorResponse({ status: 404 }), 'd')).toContain('invalide');
    expect(messageLienSignature(new HttpErrorResponse({ status: 410 }), 'd')).toContain('expiré');
    const conflit = new HttpErrorResponse({ status: 409, error: { message: 'Ce contrat ne peut plus être signé' } });
    expect(messageLienSignature(conflit, 'd')).toBe('Ce contrat ne peut plus être signé');
  });
});
