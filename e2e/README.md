# Tests de bout en bout (Playwright)

Tests e2e du front Kupanga, écrits en phase 6 de la refonte. Ils vérifient les parcours clés, la non-régression des
appels à l'API par rapport à la branche d'origine et la conformité visuelle aux maquettes.

- Navigateur : **Edge du poste** (`channel: 'msedge'`). Aucun navigateur n'est téléchargé : ne lancez pas
  `npx playwright install`.
- Données : la **base de démo** de l'API locale. Les tests ne créent, ne modifient ni ne suppriment aucune donnée
  métier : les actions finales (signer, accepter, donner congé, créer un bail ou un état des lieux, envoyer un
  message, marquer comme lu) sont interceptées avec `page.route()` / `page.routeWebSocket()` et vérifiées par le test.
  Un garde-fou fait échouer tout test dont une écriture non prévue partirait vers l'API (`outils/simul.ts`).

## Avant de lancer

1. L'API et sa base tournent (`../kupanga-Api/GUIDE-DEMARRAGE.md`) :
   ```bash
   cd ../kupanga-Api && docker compose -f docker-compose-dev.yml up -d
   ```
   Le `globalSetup` attend `http://localhost:8089/actuator/health` (`UP`) jusqu'à 2 minutes.
2. Le front tourne sur le port 4200. S'il ne tourne pas, Playwright lance `npm start` lui-même (`webServer`).

## Lancer

```bash
npm run e2e                                    # tout : connexion, ordinateur, telephone, reference, conformite
npx playwright test --project=ordinateur       # un projet
npx playwright test e2e/parcours/locataire.spec.ts --project=telephone
npx playwright test --ui                       # mode interactif
npx playwright show-report                     # rapport HTML de la dernière exécution
```

| Projet | Contenu | Bloquant |
| --- | --- | --- |
| `connexion` | Connexion par l'écran `/auth/login`, état de session par compte (`e2e/.auth/`, ignoré par git) | oui |
| `ordinateur` | `parcours/*.spec.ts` et `visuel/instantanes.spec.ts`, fenêtre 1440 × 900 | oui |
| `telephone` | Les mêmes, 390 × 844, `isMobile`, `hasTouch`, `deviceScaleFactor: 2` | oui |
| `reference` | `non-regression/*.spec.ts` : la refonte comparée à `reference.json` | oui |
| `conformite` | `visuel/maquettes.spec.ts` : comparaison aux maquettes, tableau de ratios | non (seuil large) |

### Comptes et limite de connexion

Comptes de démo : `claire`, `patrick`, `lucas`, `grace`, `ines` (`outils/comptes.ts`, mot de passe commun
`Kupanga-Dev-2026`). L'API limite la connexion à **20 essais par IP et par 15 minutes**. Le projet `connexion` garde
donc un état de session tant que son cookie de refresh est valide (14 jours ; une nouvelle connexion du compte, par
exemple dans votre navigateur, l'invalide) et ne repasse par l'écran de connexion qu'avec Inès à chaque exécution, et
pour les comptes dont l'état est périmé. En cas de 429, le message indique combien de secondes attendre.

Chaque test reçoit un jeton d'accès frais (le jeton vit 5 minutes) obtenu par `POST /auth/refresh`.

## Organisation

```
e2e/
  outils/          connexion, fixture `test` (jeton frais, garde-fou), journal des appels, réponses simulées
  parcours/        visiteur, propriétaire, locataire, candidat, signature, transverse, retour de l'assistant d'EDL
  non-regression/  appels à l'API et valeurs affichées, comparés à la branche d'origine
  visuel/          maquettes (conformité) et instantanés de référence (non-régression visuelle)
```

- `outils/test.ts` : `test.use({ compte: 'claire' })` pour une session ; `pagePrete(page)` attend la fin du réseau
  (messagerie temps réel exclue) et des polices avant un relevé ou une capture.
- `outils/simul.ts` : fabriques typées avec les DTO du front (`contrat()`, `etatDesLieux()`, `demandeLocation()`,
  `location()`), `simuler()` (répondre à la place de l'API), `intercepter()` (action finale retenue et vérifiée),
  `intercepterMessagerie()` (STOMP relayé vers l'API, sauf l'envoi d'un message).

## Non-régression des appels à l'API

But : la refonte fait **les mêmes appels** que la branche d'origine `feature/pret-pour-la-prod`, avec **les mêmes
réponses**. Pour chaque compte et chaque écran de `non-regression/scenario.ts`, la page est chargée seule, le
réseau se calme, et les appels sont relevés : méthode, chemin normalisé (`:id`, `:token`, `:email`), clés des
paramètres et du corps, empreinte de la réponse des GET (sans URL présignées, listes ordonnées).

- `reference.json` (commité) : appels de la branche d'origine ;
- `reference-valeurs.json` (commité) : valeurs métier affichées (montants, dates, statuts) sur quelques écrans clés ;
- `exceptions.ts` : écarts justifiés, chacun relié à une décision de `docs/refonte-front/00-vue-ensemble.md`.

Un appel en plus ou en moins, des clés de corps différentes ou une réponse différente font échouer le test, sauf
exception justifiée. Le test se rejoue sur la refonte seule tant que les données de démo ne changent pas ; si elles
changent, réenregistrez la référence.

### Réenregistrer la référence

L'API n'accepte que l'origine `http://localhost:4200` (CORS). Plutôt que d'arrêter le serveur de la refonte, la
référence est construite dans un **worktree** puis servie par Playwright sous cette même origine
(`non-regression/cible.ts`) ; l'API n'est pas modifiée.

```powershell
# 1. Worktree de la branche d'origine, node_modules partagé par une jonction (aucune installation)
git worktree add ../kupanga-front-reference feature/pret-pour-la-prod
cmd /c mklink /J ..\kupanga-front-reference\node_modules node_modules

# 2. Build de développement de la référence (apiUrl http://localhost:8089)
cd ../kupanga-front-reference; npx ng build --configuration development; cd ../kupanga-front

# 3. Enregistrement (écrit reference.json et reference-valeurs.json), puis comparaison
$env:KP_CIBLE = 'reference'; npx playwright test --project=reference; Remove-Item Env:KP_CIBLE
npx playwright test --project=reference
```

Le projet `reference` lance Edge avec `--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests` :
une page servie par `route.fulfill` n'a pas d'espace d'adresse connu et Edge refuserait sinon ses appels vers
`localhost:8089`. Le drapeau vaut pour les deux versions comparées.

Supprimer le worktree (la jonction d'abord, pour ne pas toucher au `node_modules` du dépôt) :

```powershell
cmd /c rmdir ..\kupanga-front-reference\node_modules
git worktree remove ../kupanga-front-reference
```

## Visuel

### Conformité aux maquettes (`conformite`, non bloquant)

Chaque écran principal est capturé à la taille de sa maquette (1440 px de large, hauteur du PNG ; 390 × 844 pour
les téléphones), avec des masques (photos, cartes, vidéo, dates et compteurs du jour), puis comparé au PNG de
`../frontend-audit/maquettes/png/`, copié dans `visuel/maquettes/`. Les planches de téléphones (`Nav-Mobile`,
`Signer-Mobile`, `Assist-EDL-Mobile`) sont **découpées** à la position de chaque écran, relevée dans le HTML de la
maquette (canevas dans une page Edge, `visuel/images.ts`).

Seuil documenté : **35 %** de pixels différents (écart de couleur supérieur à 30 %). Les maquettes montrent des
données inventées et des éléments non construits (évolutions E1 à E13) : le ratio sert à repérer une dérive, pas à
exiger l'identité.

Sorties (ignorées par git) : `visuel/conformite/tableau.md` (écran, maquette, ratio, image de différence, écarts
connus), les captures et les images de différence (rouge : pixels différents).

### Instantanés de référence (`ordinateur`, `telephone`, bloquant)

`visuel/instantanes.spec.ts` compare les mêmes écrans au **rendu validé** de la refonte (`visuel/instantanes/`),
en clair, et en sombre pour l'accueil propriétaire, Mon logement et la signature (seuil 1 % de pixels).
Les écrans montrent des données réelles datées (mois courant, échéances) : après un changement voulu de l'interface,
ou quand le mois change, régénérez :

```bash
npx playwright test e2e/visuel/instantanes.spec.ts --update-snapshots
```

## Lire les rapports

- `playwright-report/index.html` (`npx playwright show-report`) : un test échoué y montre l'erreur, la capture,
  la trace (`trace.zip`, ouvrable avec `npx playwright show-trace`) et, pour un instantané, les images attendue,
  obtenue et de différence.
- `test-results/` : artefacts bruts des tests échoués (`error-context.md` donne l'arbre d'accessibilité de la page).
- `visuel/conformite/tableau.md` : tableau de conformité aux maquettes.

## Pièges connus

- **Pas de Chrome** sur le poste : `channel: 'msedge'` partout ; Karma reste lancé avec `CHROME_BIN` sur Edge.
- **SockJS** se rabat parfois sur `xhr_streaming` (requête jamais terminée) : `networkidle` n'arrive pas, d'où
  `pagePrete()`. L'envoi d'un message est retenu sur tous les transports (`xhr_send`, `jsonp_send`, WebSocket).
- **Données datées** : les échéances et le « mois courant » changent ; les instantanés le masquent en partie.
- Les e2e ne sont pas dans la CI (`.github/workflows/deploy.yml`) : ils demandent l'API et la base.
