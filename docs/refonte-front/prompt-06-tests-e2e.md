# Prompt · Phase 6 · Tests e2e, non-régression et conformité visuelle

> À donner tel quel à une nouvelle session de Claude Code ouverte dans `kupanga/kupanga-front`.

---

Tu réalises la **phase 6 sur 6** de la refonte UX/UI du front Kupanga (Angular 20). Les phases 1 à 5 ont refait toute l'interface sur la branche `refonte-front`, sans toucher au back ni à la logique métier. Cette phase **installe Playwright** et écrit des tests de bout en bout qui vérifient trois choses :

1. les parcours clés fonctionnent ;
2. les fonctionnalités existantes ne sont pas cassées : **mêmes appels API, mêmes résultats** qu'avant la refonte ;
3. les écrans principaux sont **conformes aux maquettes**, sur ordinateur et sur téléphone.

## Règles (non négociables)

- **Ne touche pas au back.** Aucun fichier de `../kupanga-Api/`.
- **Ne modifie pas le code de l'application** pour faire passer un test. Si un test révèle un bug, note-le dans le rapport ; corrige-le seulement si la correction est petite, sûre et dans l'esprit de la refonte, dans un commit `fix(...)` séparé, et signale-le.
- Tu peux ajouter des attributs `data-testid` dans les gabarits quand aucun rôle ou libellé accessible ne suffit (commit séparé `test(...)`). Préfère `getByRole` et `getByLabel`.
- **Installation autorisée : `@playwright/test` uniquement**, en dépendance de développement (décision). **Ne lance pas `npx playwright install`** : les tests utilisent l'Edge du poste (`channel: 'msedge'`). Rien d'autre à installer. Si un besoin apparaît (comparaison d'images, par exemple), demande-moi d'abord.
- **Données** : les tests **ne créent, ne modifient ni ne suppriment aucune donnée métier** dans la base de démo. Les actions finales (signer, accepter, envoyer un message, donner congé, créer un bail…) sont **interceptées** avec `page.route()` : le test vérifie la requête (adresse, méthode, corps) et répond lui-même, sans atteindre l'API. Les états impossibles à obtenir sans données (lien de signature valide, expiré, déjà signé ; demande reçue ; logement réservé) sont simulés de la même façon, avec des réponses conformes aux DTO de `src/app/**/models/*.ts`. Si tu juges indispensable une suite sur données réelles, demande-moi avant.
- Pas de `git push`. N'ajoute pas les e2e à la CI (`.github/workflows/deploy.yml`) sans accord : ils demandent l'API et la base.

## Branche

Continue sur `refonte-front` : `git checkout refonte-front`. Le dernier commit doit être `docs(refonte): bilan de la phase 5` et l'arbre doit être propre. Sinon, arrête-toi et signale-le.

## À lire avant de commencer

1. `docs/refonte-front/00-vue-ensemble.md` : règles, décisions, profils de navigation, évolutions, **tableau de suivi** (écarts laissés par les phases 1 à 5).
2. `../frontend-audit/livraison-dev.md` et `../frontend-audit/documentation/parcours-utilisateurs.md` (8 parcours de bout en bout).
3. Les maquettes `../frontend-audit/maquettes/png/*.png` et leur HTML, pour les zones à masquer et les dimensions.
4. `../kupanga-Api/GUIDE-DEMARRAGE.md` : lancer l'API (`docker compose -f docker-compose-dev.yml up -d`), comptes de démo, mot de passe `Kupanga-Dev-2026`.
5. Le code : `src/app/app.routes.ts`, les services (`*.service.ts`) pour la liste des appels, les modèles pour les réponses simulées, `src/environments/environment.ts` (`apiUrl: http://localhost:8089`).

## Mise en place

1. `npm install -D @playwright/test` (version stable courante, publiée depuis au moins deux semaines), sans `playwright install`.
2. `playwright.config.ts` à la racine :
   - `testDir: 'e2e'` ;
   - `webServer` qui lance `npm start` (port 4200) et le réutilise s'il tourne déjà ;
   - `use.baseURL: 'http://localhost:4200'` ;
   - `use.serviceWorkers: 'block'` ;
   - `locale: 'fr-FR'`, `timezoneId: 'Europe/Paris'` ;
   - projets :
     - `ordinateur` : `channel: 'msedge'`, fenêtre 1440 × 900 ;
     - `telephone` : `channel: 'msedge'`, 390 × 844, `isMobile`, `hasTouch`, `deviceScaleFactor: 2` ;
     - `reference` : pour la non-régression des appels, voir plus bas.
   - Captures `toHaveScreenshot` avec animations coupées (`animations: 'disabled'`) et `reducedMotion: 'reduce'`.
3. Script npm : `"e2e": "playwright test"`. Sorties (`test-results/`, `playwright-report/`) dans `.gitignore`.
4. Vérifie que `tsconfig.app.json` et `tsconfig.spec.json` n'incluent pas `e2e/` (Karma ne doit pas les charger) et donne aux e2e leur `tsconfig` si nécessaire.
5. Utilitaires dans `e2e/outils/` :
   - **connexion** par l'écran `/auth/login`, pour tester le vrai parcours une fois, puis **état de session réutilisé** (`storageState`) par compte : `claire`, `patrick`, `lucas`, `grace`, `ines` ;
   - **journal des appels API** : fixture qui enregistre chaque requête vers `localhost:8089` (méthode, chemin normalisé avec les identifiants remplacés par `:id` et les jetons par `:token`, clés du corps JSON) ;
   - **fabriques de réponses** typées avec les modèles du front (`ContratDTO`, `EtatDesLieuxDTO`, `DemandeLocation`…) pour les états simulés.

## Tests à écrire

### A. Parcours de bout en bout (`e2e/parcours/`), ordinateur et téléphone

| Fichier | Compte | Ce qui est vérifié |
| --- | --- | --- |
| `visiteur.spec.ts` | aucun | Landing (RDC par défaut, bascule France), « Annonces » → Explorer, filtres (l'URL change et se recharge avec les mêmes résultats), trois vues, ouverture d'une annonce France et d'une annonce RDC (DPE et GES ou courant et garantie), « Contacter » → connexion avec `returnUrl` |
| `proprietaire.spec.ts` | Claire, puis Patrick (RDC) | Barre latérale ; accueil (chiffres cohérents avec les données : 6 biens, 1 loué pour Claire) ; filtres Tous / Loués / Vacants ; fiche du bien loué et ses 4 onglets ; bail (page, assistant jusqu'à la vérification, « Quitter » demande confirmation, « Continuer » dit ce qui manque) ; état des lieux (assistant pièce par pièce, « H.S. » sur téléphone, **pas de bloc photos**) ; quittances (tableau, carte par ligne sur téléphone) ; création finale **interceptée** (corps vérifié) ; messagerie : la barre latérale **reste** quand une conversation est ouverte, retour sur téléphone, filtre Non lues, message **intercepté** |
| `locataire.spec.ts` | Lucas, puis Grâce (RDC) | Arrivée directe sur `/mon-logement` ; barre du haut ; onglets Logement / Documents / Quittances / Messages ; quittances groupées par année ; « Donner congé » ouvert, requête **interceptée** et vérifiée ; logement réservé avec compte à rebours (bien simulé) |
| `candidat.spec.ts` | Inès | Accueil candidat ; pas de « Favoris » ; demande à traiter (simulée) : « Accepter » envoie la même requête qu'avant (`DemandeLocationService.accepter`), **interceptée** ; « Refuser » demande confirmation |
| `signature.spec.ts` | aucun | `/contrats/signer/:token` et `/edl/signer/:token` : **lien valide** (simulé) avec aperçu construit avec les champs du contrat, « Signé par … le … », case « J'ai lu… » qui active « Signer », fenêtre de signature (tracé à la souris ou au doigt), `POST /signer/:token` **intercepté** avec `signatureBase64`, écran « Bail signé » ; PDF : clic qui **relance le GET** avant d'ouvrir `urlPdf` ; **expiré** (410 simulé), **inconnu** (404 réel avec un faux jeton), **déjà signé** (409 simulé) : écran `Signer-Lien-Invalide` avec un message distinct pour chacun ; parcours en 3 étapes sur téléphone |
| `transverse.spec.ts` | Claire et Lucas | Thème sombre (Compte → Thème) appliqué et gardé après rechargement ; navigation au clavier (focus visible) ; Échap ferme une fenêtre ; toasts ; hors ligne (`context.setOffline`) sur Mon logement |

### B. Non-régression des appels API (`e2e/non-regression/`)

But : prouver que la refonte fait **les mêmes appels** qu'avant, avec **les mêmes résultats**.

1. **Référence** : crée un worktree de la branche d'origine, `git worktree add ../kupanga-front-reference feature/pret-pour-la-prod`.
   - Pour éviter une installation, relie son `node_modules` à celui du dépôt avec une jonction : `cmd /c mklink /J ..\kupanga-front-reference\node_modules node_modules`. Les dépendances de l'application sont identiques ; seul `@playwright/test` diffère et la référence ne s'en sert pas.
   - L'API locale n'autorise que l'origine `http://localhost:4200` (CORS, `GUIDE-DEMARRAGE.md` §3). Ne modifie pas l'API. Lance donc les deux versions **l'une après l'autre sur le port 4200** : d'abord la référence (`npx ng serve` dans le worktree), avec un enregistrement des appels dans `e2e/non-regression/reference.json` (commité), puis la refonte, comparée à ce fichier. Le test peut ainsi être rejoué sur la refonte seule tant que les données de démo ne changent pas.
2. **Scénario indépendant de l'interface** : pour chaque compte et chaque route (liste dérivée de `app.routes.ts` : accueil, biens, fiche d'un bien connu, bail, états des lieux, quittances, mon-logement, quittances, documents, messages, notifications, compte, explorer, une annonce, demandes-location), charge la page, attends la fin du réseau, puis enregistre les appels avec le journal de la mise en place.
3. **Comparaison** entre la référence et `refonte-front`, route par route :
   - même **ensemble** d'appels (méthode + chemin normalisé) ;
   - mêmes clés de corps ;
   - mêmes **réponses** pour les GET : hash du corps JSON, après avoir retiré les champs volatils comme les URL signées `urlPdf` et les dates relatives.
   Un appel en plus ou en moins fait échouer le test, **sauf** s'il figure dans une liste d'exceptions justifiées dans le fichier. Exemple : la phase 3 réutilise la liste des conversations sur la fiche du bien ; c'est une méthode existante, ajoutée à l'écran. Toute exception figure dans le rapport.
4. **Mêmes résultats affichés** : sur quelques écrans clés (accueil de Claire, Mon logement de Lucas, quittances, annonce), compare les **valeurs métier** affichées (montants, nombres de biens, statuts, dates) entre la référence et la refonte par leur texte, indépendamment de la mise en page.
5. Le worktree n'est pas commité. Indique dans le README des e2e comment le recréer et le supprimer (`git worktree remove`).

### C. Conformité visuelle aux maquettes (`e2e/visuel/`)

Deux niveaux.

1. **Conformité aux maquettes** (projet `conformite`, non bloquant) :
   - Pour chaque écran principal, capture la page à la taille de la maquette (1440 px de large, hauteur du PNG de référence), avec des **masques** sur les zones qui ne peuvent pas être identiques : photos (placeholders vert-gris dans les maquettes), tuiles de carte, dates, compteurs dynamiques.
   - Compare la capture au PNG de `../frontend-audit/maquettes/png/` avec la comparaison d'images intégrée à Playwright : `expect(capture).toMatchSnapshot()`, avec le PNG de maquette copié comme instantané attendu dans `e2e/visuel/maquettes/`. Fixe un seuil large et documenté.
   - Produis un **tableau** : écran, maquette, ratio de pixels différents, image de différence, écarts connus (repris des bilans de phase).
   - **Téléphone** : les planches `Nav-Mobile`, `Signer-Mobile` et `Assist-EDL-Mobile` contiennent plusieurs téléphones. Découpe le téléphone voulu dans le PNG en relevant ses coordonnées dans le HTML de la maquette, sans outil supplémentaire (canvas dans une page Playwright, par exemple). Si c'est trop fragile, produis à la place une **planche côte à côte** (capture | maquette) pour une revue humaine, et dis-le.
   - Écrans couverts sur ordinateur : `O1v2-Landing`, `O1v2-Explorer`, `Annonce-France`, `Annonce-RDC`, `Annonce-Proprio`, `Nav-Proprio-Tableau`, `Nav-Proprio-Messages`, `Nav-Candidat`, `Fiche-Bien-Loue`, `Fiche-Bien-Vacant`, `Assist-Bail`, `Bail-A-Signer`, `Assist-EDL`, `Mon-Logement`, `Mon-Logement-Quittances`, `Mon-Logement-Reserve`, `Signer-Bail`, `Signer-Lien-Invalide`.
   - Sur téléphone : `Nav-Mobile` (3 profils), `Assist-EDL-Mobile`, `Signer-Mobile`.
   - Les écrans qui demandent un état absent des données de démo utilisent des réponses simulées.
2. **Non-régression visuelle** (bloquant) : `toHaveScreenshot()` sur les mêmes écrans, ordinateur et téléphone, clair et sombre pour au moins l'accueil propriétaire, Mon logement et la signature. L'instantané de référence est **le rendu actuel validé** : il protège la refonte des régressions futures.

## Pièges repérés

- **Pas de Chrome** sur le poste : `channel: 'msedge'` partout. Karma reste lancé avec `CHROME_BIN` pointant sur Edge.
- **Service worker** : désactivé dans `ng serve`, mais `serviceWorkers: 'block'` évite toute surprise.
- **Polices** : Figtree vient de Google Fonts. Attends `document.fonts.ready` avant chaque capture, sinon les captures changent d'une exécution à l'autre.
- **WebSocket** de la messagerie (`/ws`, STOMP) : il ne fait pas partie des appels comparés ; filtre-le du journal. Attends la connexion avant de tester les non-lus.
- **URL signées** (`urlPdf`) : elles changent à chaque appel. Exclus-les des hash et des captures.
- **Ouvrir une conversation la marque comme lue** dans la base de démo : un effet de bord accepté par l'audit. Limite-le à une seule conversation et signale-le.
- **Ordre des tests** : chaque test doit être indépendant. Pas d'état partagé hors `storageState`.
- **Lenteur au démarrage** : l'API Spring Boot peut mettre du temps à répondre au premier appel. Ajoute un `globalSetup` qui attend `http://localhost:8089/actuator/health` (statut `UP`).
- **Thème du système** : fixe `colorScheme: 'light'` par défaut ; les tests du sombre le passent à `'dark'`.

## Commits attendus (dans cet ordre, build vert à chaque fois)

1. `build(e2e): ajout de Playwright avec Edge`
2. `test(e2e): outils de connexion, journal des appels API et réponses simulées`
3. `test(e2e): parcours visiteur`
4. `test(e2e): parcours propriétaire`
5. `test(e2e): parcours locataire`
6. `test(e2e): parcours candidat`
7. `test(e2e): signature par lien (valide, expiré, inconnu, déjà signé)`
8. `test(e2e): thème, clavier, toasts et hors ligne`
9. `test(e2e): non-régression des appels API par rapport à la branche d'origine`
10. `test(e2e): conformité visuelle aux maquettes et instantanés de référence`
11. `docs(e2e): lancer les tests e2e et lire les rapports`
12. `docs(refonte): rapport final de la refonte`

Ajoute éventuellement des commits `test(...)` pour des `data-testid`, et des `fix(...)` pour des bugs révélés, séparés et signalés. Messages en français, format Conventional Commits. Ajoute la ligne `Co-Authored-By` si ton environnement en demande une.

## Vérifications de fin de phase

1. `npm run build -- --configuration production` passe.
2. Tests unitaires avec Edge : tous passent.
   ```powershell
   $env:CHROME_BIN = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
   npx ng test --watch=false --browsers=ChromeHeadless
   ```
3. `npm run e2e` : projets `ordinateur` et `telephone` au vert. Le projet `conformite` produit son tableau.
4. La non-régression des appels compare la référence et la refonte sans écart non justifié.
5. **Base de démo intacte** : aucun bien, bail, état des lieux, quittance, demande ni message créé ou modifié. Seules les conversations éventuellement marquées comme lues sont acceptées. Vérifie-le, par exemple en comptant les lignes avant et après sur les tables principales, en lecture seule sur la base `kupanga_dev`, sans rien y écrire.

## Rapport final (à me donner, et à écrire dans `docs/refonte-front/rapport-final.md`)

- **Tests** : nombre par projet, passés et échoués ; durée ; comment les relancer.
- **Non-régression des appels** : routes comparées, écarts justifiés, écarts non justifiés (à traiter).
- **Conformité visuelle** : tableau écran par écran (ratio, image de différence, écarts restants et leur raison).
- **Bugs trouvés** : corrigés (commit) ou non (description).
- **Écarts restants** de toute la refonte, repris des bilans des phases 1 à 5.
- **Évolutions serveur** : liste finale (E1 à E5, plus les nouvelles).
- **Points à décider** : vidéo de la landing, entrée « Demandes de location », e2e dans la CI, `design-system.yml`, et tout ce que tu as relevé.
- Mets à jour la ligne « Phase 6 » du tableau de suivi de `00-vue-ensemble.md`.

**Arrête-toi là.** Ne pousse rien et n'ouvre pas de pull request sans mon accord.
