# Kupanga — Frontend

Application web de gestion immobiliere de particulier a particulier.

## Architecture

La documentation d'architecture technique complete est disponible dans **[DAT-front.md](./DAT-front.md)**.

Elle couvre : structure des dossiers, composants, state management (NgRx + Signals), routing, couche HTTP, formulaires, theming Angular Material et points d'attention.

---

## Stack technique

| Technologie | Version |
|:---|:---|
| Angular | 20.3.0 |
| TypeScript | 5.9.2 |
| Angular Material | 20.2.14 |
| NgRx Store / Effects | 20.1.0 |
| RxJS | 7.8.x |
| @stomp/stompjs | 7.3.0 |
| SockJS | 1.6.1 |
| lucide-angular | 1.0.0 |
| TailwindCSS | 3.4.4 |
| Angular CLI | 20.3.8 |

---

## Structure du projet

```
src/
  app/
    core/               # Guards, interceptors, services singleton (auth, theme, logement-context)
    shared/             # Composants UI reutilisables (14 composants)
    features/
      account/          # Profil et parametres compte
      biens/            # CRUD biens + recherche filtree
      contrats/         # Liste contrats + page signature token
      dashboard/        # Vue synthetique
      etats-des-lieux/  # Liste EDL + page signature token
      gestion-logement/ # Shell 5 onglets (contrat/EDL/quittances/docs/resume)
      messagerie/       # Chat temps reel (WebSocket STOMP)
      notifications/    # Notifications in-app
      quittances/       # Liste quittances
      tenant/           # Espace locataire (mon-logement + documents)
    layouts/            # DashboardLayout (shell principal)
    store/              # NgRx (AppState minimal)
  styles/               # Tokens SCSS, theming Material, reset, typo
  environments/         # dev (localhost:8089) / prod (Render)
```

---

## Lancer l'application

### Serveur de developpement

```bash
ng serve
```

Ouvrir `http://localhost:4200/`. L'API back-end doit etre accessible sur `http://localhost:8089`.

### Build

```bash
ng build
```

Les artefacts sont generes dans `dist/`.

### Tests unitaires

```bash
ng test
```

Executeur : Karma + Jasmine.

---

## Code scaffolding

```bash
ng generate component component-name
```

Pour voir tous les schematics disponibles :

```bash
ng generate --help
```

---

## Ressources

- [Angular CLI](https://angular.dev/tools/cli)
- [Angular Material](https://material.angular.io)
- [NgRx](https://ngrx.io)
- [DAT-front.md](./DAT-front.md) — Architecture technique frontend
