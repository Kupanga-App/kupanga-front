import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ChatWebSocketService } from './chat-websocket.service';
import { MessageDTO, StatutEnvoiEvent } from '../models/chat.models';

/** Faux client STOMP : garde les abonnements pour simuler les trames du serveur. */
class FauxStomp {
  connected = false;
  active = true;
  publish = jasmine.createSpy('publish');
  abonnements = new Map<string, (msg: { body: string }) => void>();
  subscribe(destination: string, callback: (msg: { body: string }) => void) {
    this.abonnements.set(destination, callback);
    return { unsubscribe: () => undefined };
  }
  deactivate() {
    return Promise.resolve();
  }
  recevoir(destination: string, corps: object) {
    this.abonnements.get(destination)!({ body: JSON.stringify(corps) });
  }
}

describe('ChatWebSocketService (W11-13)', () => {
  let service: ChatWebSocketService;
  let stomp: FauxStomp;
  let statuts: StatutEnvoiEvent[];
  const payload = { contenu: 'Bonjour', emailDestinataire: 'bob@test.com', bienId: 1 };

  // Accès aux membres privés pour piloter la connexion sans vrai serveur
  const interne = () => service as unknown as {
    stompClient: FauxStomp | null;
    subscribeToQueues(): void;
    publierFile(): void;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: signal(null), getAccessToken: () => null, refreshToken: () => of(null) },
        },
      ],
    });
    service = TestBed.inject(ChatWebSocketService);
    stomp = new FauxStomp();
    interne().stompClient = stomp;
    interne().subscribeToQueues();
    statuts = [];
    service.statutsEnvoi$.subscribe((s) => statuts.push(s));
  });

  it("s'abonne seulement aux files privées /user/queue/** (plus de /user/{email}/...)", () => {
    expect([...stomp.abonnements.keys()].sort()).toEqual([
      '/user/queue/app-notifications',
      '/user/queue/errors',
      '/user/queue/messages',
      '/user/queue/notifications',
    ]);
  });

  it('déconnecté : le message reste en file puis part à la reconnexion avec son id-client', () => {
    const idClient = service.envoyer(payload);

    expect(stomp.publish).not.toHaveBeenCalled();
    expect(statuts).toEqual([{ idClient, statut: 'en_attente' }]);

    stomp.connected = true;
    interne().publierFile();

    expect(stomp.publish).toHaveBeenCalledOnceWith({
      destination: '/app/chat.send',
      body: JSON.stringify(payload),
      headers: { 'id-client': idClient },
    });
  });

  it("sans accusé du serveur après 15 s : échec, et pas de renvoi automatique à la reconnexion", fakeAsync(() => {
    stomp.connected = true;
    const idClient = service.envoyer(payload);

    tick(15000);

    expect(statuts.at(-1)).toEqual(jasmine.objectContaining({ idClient, statut: 'echec' }));
    interne().publierFile();
    expect(stomp.publish).toHaveBeenCalledTimes(1);
  }));

  it("écho du serveur (même idClient) : confirmé, plus d'échec, message transmis à l'écran", fakeAsync(() => {
    stomp.connected = true;
    const recus: MessageDTO[] = [];
    service.messages$.subscribe((m) => recus.push(m));
    const idClient = service.envoyer(payload);

    stomp.recevoir('/user/queue/messages', { id: 42, contenu: 'Bonjour', idClient });
    tick(15000);

    expect(recus.map((m) => m.id)).toEqual([42]);
    expect(statuts.some((s) => s.statut === 'echec')).toBeFalse();
  }));

  it('refus du serveur sur /user/queue/errors : échec avec le message, puis renvoi manuel', () => {
    stomp.connected = true;
    const idClient = service.envoyer(payload);

    stomp.recevoir('/user/queue/errors', { message: "Ce bien n'est plus disponible", idClient });

    expect(statuts.at(-1)).toEqual({ idClient, statut: 'echec', erreur: "Ce bien n'est plus disponible" });

    service.renvoyer(idClient);
    expect(stomp.publish).toHaveBeenCalledTimes(2);
    expect(statuts.at(-1)).toEqual({ idClient, statut: 'en_attente' });
  });

  it('déconnexion du compte : la file est vidée', () => {
    service.envoyer(payload);
    service.disconnect();

    stomp.connected = true;
    interne().stompClient = stomp;
    interne().publierFile();
    expect(stomp.publish).not.toHaveBeenCalled();
  });
});
