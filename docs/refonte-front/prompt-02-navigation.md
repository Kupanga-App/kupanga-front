# Prompt · Phase 2 · Navigation

> À donner tel quel à une nouvelle session de Claude Code ouverte dans `kupanga/kupanga-front`.

---

Tu réalises la **phase 2 sur 6** de la refonte UX/UI du front Kupanga (Angular 20, composants autonomes, signaux). La phase 1 a posé les jetons `--kp-*`, la police Figtree, le logo et les composants transverses. Cette phase refait la **navigation** : barre latérale propriétaire, barre du haut locataire et candidat, en-tête et onglets du bas sur téléphone, messagerie à défilements séparés, et arrivée du locataire sur `/mon-logement`. Le contenu des écrans ne change pas encore, sauf la page Messages.

## Règles (non négociables)

- **Ne touche pas au back.** Aucun fichier de `../kupanga-Api/`.
- **Logique métier intacte.** Mêmes routes (`src/app/app.routes.ts`), mêmes appels API, mêmes données, mêmes règles de validation, mêmes guards. Tu changes l'apparence, l'organisation des écrans et les composants d'interface. Seule exception autorisée dans cette phase : la fonction de redirection `accueilPour()`, décrite plus bas.
- **Rien d'inventé.** « Favoris » et les « alertes » de recherche n'existent pas dans l'API (évolutions E4 et E5) : pas d'entrée, pas d'onglet, pas de tuile.
- **Pas d'installation.** Edge à la place de Chrome (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
- **Pas de nouvelle route.** Ne crée ni ne modifie aucune donnée métier : ouvrir une conversation la marque comme lue, signale-le dans ton rapport. Pas de `git push`.

## Branche

Continue sur `refonte-front` : `git checkout refonte-front`. Vérifie que le dernier commit est `docs(refonte): bilan de la phase 1` et que l'arbre est propre. Sinon, arrête-toi et signale-le.

## À lire avant de commencer

1. `docs/refonte-front/00-vue-ensemble.md`, en particulier les sections « Profils de navigation » et « Note sur la redirection du locataire ».
2. `../frontend-audit/livraison-dev.md` : lignes « Navigation propriétaire », « Navigation locataire / candidat », « Navigation téléphone » des composants transverses, et lignes « Messagerie », « Navigation téléphone » des spécifications par écran.
3. Maquettes (PNG puis HTML dans `../frontend-audit/maquettes/`) :
   - `Nav-Proprio-Tableau` : **seulement la barre latérale**, le contenu de l'accueil vient en phase 3 ;
   - `Nav-Proprio-Messages` ;
   - `Nav-Candidat` : **seulement la barre du haut**, le contenu vient en phase 4 ;
   - `Mon-Logement` : la barre du haut du locataire (Accueil · Mon logement · Explorer) ;
   - `Nav-Mobile` : trois téléphones, propriétaire, locataire et candidat.
   La planche `Nav-Locataire` est **retirée** (décision) : ne la suis pas.
4. `../frontend-audit/documentation/cartographie-ecrans.md` : sections navigation et messagerie, pour l'existant.
5. Le code : `src/app/layouts/app-shell/*`, `src/app/core/navigation/navigation.service.ts` (+ spec), `src/app/core/services/logement-context.service.ts`, `src/app/core/auth/guards/auth.guard.ts`, `src/app/shared/ui/cloche.component.ts` (+ spec), `src/app/shared/ui/page-header.component.ts`, `src/app/features/messagerie/**`, `src/app/shared/ui/logo.component.ts` (créé en phase 1).

## Travail à réaliser

### 1. Profil de navigation (`navigation.service.ts`)

- Ajoute un signal calculé `profil`, qui vaut `'visiteur' | 'candidat' | 'locataire' | 'proprietaire'`. Il se déduit de `auth.currentUser()`, `logement.aDesBiens()` et `logement.hasLogement()` selon la table de `00-vue-ensemble.md`. Un compte qui possède un bien est « propriétaire », même s'il loue aussi.
- Recalcule `onglets` (ordinateur) et `ongletsMobile` (téléphone) par profil, selon la même table et les maquettes :
  - propriétaire, barre latérale : Accueil · Mes biens (avec compteur de biens) · Messages (avec non-lus) · Documents ; si le compte loue aussi, ajoute Mon logement · Quittances. En bas : « Voir les annonces » (`/explorer`), la carte du compte (avatar + nom → `/compte`) et la cloche (`/notifications`).
  - locataire, barre du haut : Accueil · Mon logement · Explorer.
  - candidat, barre du haut : Accueil · Explorer · Messages.
  - téléphone, propriétaire : Accueil · Mes biens · Messages · Documents · Compte.
  - téléphone, locataire : Accueil · Mon logement · Messages · Documents · Compte.
  - téléphone, candidat : Accueil · Explorer · Messages · Compte (sans Favoris).
  - visiteur : inchangé (Explorer, Se connecter).
- Garde `pleinEcran`, `pleinEcranDemande`, `aDesBiens`, `aUnLogement` et `aDesDocuments` : d'autres écrans les lisent. Garde la règle actuelle de `aDesDocuments` (l'onglet Documents seulement si le compte a un bien ou un logement).
- Mets à jour `navigation.service.spec.ts` avec un cas par profil.

### 2. Barre latérale propriétaire (`app-shell`)

- `Nav-Proprio-Tableau` et `Fiche-Bien-Vacant` : carte blanche fixe de largeur `--kp-sidebar-w`, logo `kp-logo` en haut, entrées en pilule de 40 px, élément actif en nuit plein, compteurs à droite. En bas, « Voir les annonces » en bouton contour, puis la carte du compte avec la cloche. **Seule la liste d'entrées défile.**
- Supprime les jetons `--kp-nav-*` (alias de la phase 1) et leurs usages.
- Le logo texte (`span.logo__k`, `.logo__nom` en `--kp-font-display`) est remplacé par `kp-logo`.

### 3. Barre du haut locataire et candidat

- `Mon-Logement` et `Nav-Candidat` : barre blanche collante en pilule, logo à gauche, entrées au centre (36 px, actif en nuit plein), cloche puis bouton avatar + prénom et initiale à droite. Ce bouton ouvre un menu vers des routes existantes : Compte, Documents (si `aDesDocuments`), Messages, et Déconnexion avec la méthode existante d'`AuthService`.
- Visiteur sur Explorer et Annonce : barre publique avec logo, Annonces, « Se connecter » et « Créer un compte ». Son style final vient en phase 5 ; ici, garde-la fonctionnelle.

### 4. Téléphone (`Nav-Mobile`)

- En-tête fixe : logo, cloche et avatar (→ `/compte`). Onglets du bas fixes (`--kp-tabbar-h` 64 px + zone sûre), actif en pilule nuit, libellés courts. **Seul le contenu défile.**
- Garde le mécanisme `data-onglets` / `--kp-bottom-offset` (`app-shell.component.ts`), dont dépendent les barres d'action collées en bas.

### 5. Messagerie (`Nav-Proprio-Messages`)

- **Bug de l'audit à corriger** : sur ordinateur, la barre latérale disparaît dès qu'une conversation est ouverte, et il n'y a pas de retour. La cause est `messages.component.ts:111` : `effect(() => this.nav.pleinEcranDemande.set(this.showView()))`. Le plein écran ne doit s'appliquer **que sur téléphone**. Utilise `BreakpointObserver` de `@angular/cdk/layout` (déjà installé) ou un `matchMedia` aligné sur `src/styles/_mq.scss`. Garde la remise à faux à la destruction (ligne 149).
- Ordinateur : liste et conversation côte à côte, chacune avec **son propre défilement**. La page elle-même ne défile pas.
- Téléphone : liste, puis conversation en plein écran avec un bouton retour visible dans son en-tête.
- Le filtre Toutes / Non lues existe déjà (`conversation-list.component.html:11`, `kp-segmented`) : restyle-le seulement.
- « Proposer la location » dans l'en-tête de la conversation, pour le propriétaire du bien concerné. Le lien mène à la route existante `/biens/:id/locataire`. N'affiche ce bouton que si la conversation porte un `bienId` dont le compte est propriétaire, avec les données déjà disponibles. Si elles ne permettent pas de le savoir, ne l'ajoute pas et signale-le.
- Ne touche pas à `chat-store.service.ts`, `chat-websocket.service.ts` ni `chat.service.ts`.

### 6. Arrivée du locataire sur `/mon-logement`

- Dans `src/app/core/auth/guards/auth.guard.ts`, `accueilPour(user)` renvoie aujourd'hui `/accueil` pour tout compte connecté qui a un profil. Nouveau comportement : si le compte **loue un logement et ne possède aucun bien**, il renvoie `/mon-logement`, sinon `/accueil` ; visiteur et compte Google sans profil sont inchangés.
- La fonction a besoin de `aDesBiens` et `hasLogement` : ajoute un paramètre, par exemple `accueilPour(user, { aDesBiens, aUnLogement })`, alimenté par `accueilGuard` **après** `logement.charger(user.id)`, qui fait déjà cet appel. **Pas de nouvel appel API.**
- Repère tous les appelants de `accueilPour` avec Grep (connexion, inscription, Google…) et garde-les cohérents.
- `/accueil` reste accessible au locataire par son entrée de navigation.
- Ajoute ou mets à jour les tests unitaires de `accueilPour`.

## Pièges et risques de régression repérés

- **Valeurs en cache du profil** : `LogementContextService` relit `kp_a_des_biens` et `kp_logement_bien_id` depuis `localStorage` avant l'appel `GET /users/biens`. Au premier rendu, le profil peut donc venir d'une session précédente, puis basculer. Évite l'effet visible (pas de saut entre barre latérale et barre du haut) et vérifie la déconnexion : `clear()` doit ramener au profil visiteur.
- **Hors ligne** : `catchError` renvoie les dernières valeurs. La navigation doit rester utilisable sans réseau (`hors-ligne.service.ts`).
- **Écrans pleins** : les routes `data: { pleinEcran: true }` (assistants, nouvelle quittance, nouveau bien) n'affichent aucune barre. Ne casse pas ce mécanisme.
- **`cloche.component.spec.ts`** cherche `a[href="/notifications"]` et `.kp-pastille` avec le compteur : garde-les dans la nouvelle cloche.
- **`ChatNotificationComponent`** (`<kp-chat-notification />` dans le shell) : garde-le monté.
- **Zones sûres** (`--kp-safe-*`) et `interactive-widget=resizes-content` : le clavier ne doit pas masquer la saisie du message sur téléphone.
- **View Transitions** du routeur (fondu de 160 ms) : la barre latérale ne doit pas clignoter d'un écran à l'autre.
- **Écran « Demandes de location »** (`/demandes-location`) : l'audit note qu'il n'apparaît dans aucun menu. N'ajoute pas d'entrée sans décision. Il est repris sur l'accueil candidat en phase 4 ; signale-le dans ton rapport.
- **Compteur de biens** de la barre latérale : utilise une donnée déjà chargée (`DonneesProprietaireService` ou le contexte). S'il n'en existe pas sans nouvel appel, n'affiche pas le compteur et signale-le.
- **Page Compte** : la carte du compte affiche aujourd'hui « Propriétaire » (`compte.component.html:11`, reste du modèle à rôles). Ne la touche pas ici, c'est la phase 5. N'affiche pas de rôle dans la nouvelle carte de la barre latérale.

## Commits attendus (dans cet ordre, build vert à chaque fois)

1. `feat(nav): profil de navigation déduit des biens et du logement`
2. `feat(nav): barre latérale propriétaire`
3. `feat(nav): barre du haut locataire et candidat`
4. `feat(nav): en-tête et onglets du bas sur téléphone`
5. `fix(messagerie): barre latérale conservée sur ordinateur quand une conversation est ouverte`
6. `feat(messagerie): liste et conversation à défilements séparés`
7. `feat(messagerie): proposer la location depuis l'en-tête de la conversation` (seulement si les données le permettent)
8. `feat(nav): le locataire sans bien arrive sur Mon logement`
9. `refactor(ds): retrait des jetons --kp-nav-*`
10. `docs(refonte): bilan de la phase 2`

Messages en français, format Conventional Commits. Ajoute la ligne `Co-Authored-By` si ton environnement en demande une. Avant chaque commit : `npm run build -- --configuration production`.

## Vérifications de fin de phase

1. **Build** : `npm run build -- --configuration production`.
2. **Tests existants avec Edge** : tous passent, plus les nouveaux.
   ```powershell
   $env:CHROME_BIN = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
   npx ng test --watch=false --browsers=ChromeHeadless
   ```
3. **Application utilisable** : API locale lancée (`../kupanga-Api/GUIDE-DEMARRAGE.md`) et `npm start`. Connecte-toi avec chaque profil (mot de passe `Kupanga-Dev-2026`) :
   - `claire.martin@kupanga.dev` : propriétaire, barre latérale ;
   - `lucas.bernard@kupanga.dev` : locataire, arrive sur `/mon-logement`, barre du haut ;
   - `ines.moreau@kupanga.dev` : candidate, barre du haut ;
   - un visiteur, non connecté.
   Pour chacun : tous les liens de navigation, déconnexion puis reconnexion avec un autre profil (pas de profil restant en mémoire), messagerie sur ordinateur et sur téléphone.
4. **Comparaison aux maquettes** : captures Edge headless par CDP (script Node 24 dans ton dossier temporaire), puis lecture côte à côte avec Read.
   - Barre latérale (1440) → `Nav-Proprio-Tableau`.
   - Messages (1440) → `Nav-Proprio-Messages`.
   - Barre du haut de la candidate (1440) → `Nav-Candidat`.
   - Barre du haut du locataire (1440) → `Mon-Logement`.
   - Les trois profils sur téléphone (390 × 844) → `Nav-Mobile`.
5. **Écarts restants**, écran par écran, avec leur raison. Les contenus d'écran attendus en phase 3 ou 4 ne sont pas des écarts.

## Rapport de fin de phase (à me donner, court)

- Commits (hash court + message).
- Build, tests (X sur Y), parcours vérifiés par profil.
- Écarts avec les maquettes et pourquoi.
- Effets de bord sur les données (conversations marquées comme lues…).
- Décisions à prendre (par exemple : entrée « Demandes de location »).
- Ce que fera la phase 3.

**Arrête-toi là.** N'enchaîne pas sur la phase 3.
