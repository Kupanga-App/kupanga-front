# Audit UX/UI du front Kupanga

> Audit du 2026-10-12, sur le dépôt `kupanga-front` (Angular 20, 125 fichiers TS, 73 gabarits, ~12 800 lignes de SCSS).
> Objectif : une application **simple à parcourir**, **sans trace de style « généré par IA »**, sans élément inutile, et une
> version mobile qui se comporte comme une **application native**, pas comme un site rétréci.
> Le prompt pour faire produire le prototype navigable de toute l'application est dans [`PROMPT-MAQUETTES.md`](PROMPT-MAQUETTES.md).

---

## 1. Verdict

L'application est solide fonctionnellement (sécurité, hors ligne, multi-pays), mais l'interface :

1. **raconte une histoire au lieu d'aider** : métaphore de « journal » (numéros d'édition, rubriques, « Édition matinale »), titres en italique décoratif, petits surtitres numérotés partout ;
2. **promet ce qu'elle ne fait pas** : boutons sans effet, fonctions « Bientôt », badge « Vérifié » sans vérification, actions vers des pages qui n'existent pas ;
3. **n'a pas de point d'entrée clair par rôle** : le propriétaire arrive sur la liste publique des annonces, pas sur ce qu'il doit faire ;
4. **est un site responsive sur mobile** : barre du haut + menu tiroir, `100vh`, aucune zone sûre (encoche), pas de barre d'onglets, pas de feuilles du bas, 18 points de rupture différents.

Note globale actuelle : **UX 5/10, UI 6/10, mobile 4/10.** Les sections 3 à 7 listent ce qu'il faut retirer ou corriger ; la section 8 décrit la cible.

---

## 2. Méthode

- Lecture des routes (`app.routes.ts`, `gestion-logement.routes.ts`), de la navigation (`principal-nav-header`), des mises en page et de chaque page.
- Recherche systématique : composants jamais importés, textes affichés, boutons sans action, liens `href="#"`, blocs commentés, `console.log`, couleurs et tailles en dur, points de rupture.
- Pas de test sur appareil : les constats « mobile » viennent du code (SCSS, structure), à confirmer en recette sur un Android d'entrée de gamme et un iPhone.

---

## 3. Le « style IA » à faire disparaître

Ce qui donne l'impression d'une interface générée, et ce qu'on met à la place.

| Constat | Où | À faire |
|---|---|---|
| **Métaphore « journal »** : « Le journal · Édition matinale », badges `N° 0001` à `N° 0007`, date du jour, « Paris · FR » (faux au Congo), rubriques « p. 02 — Biens… » | `core/auth/shared/auth-layout-c/*`, les 7 pages d'authentification (`login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `complete-profile`) | Supprimer la mise en page « masthead » et les rubriques. Une colonne : logo, titre court, formulaire. Sur ordinateur, au plus une photo ou une illustration à côté, sans texte. |
| **Surtitres numérotés** (`eyebrow`) : « 01 · Connexion », « 04 · Inscription · 2/2 », « Propriétaire · Portefeuille », « Explorer · Parc locatif » | 19 gabarits | Supprimer. Le titre suffit ; l'étape d'un formulaire s'affiche dans la barre de progression. |
| **Titres en italique décoratif** : « Mes *biens* », « Biens *disponibles* », « Bienvenue chez *vous* », « Rejoindre·Kup*anga* » | 10 titres (`<h1>`/`<h2>` avec `<em>`) | Titres simples, sans italique ni jeu typographique. |
| **Textes « bons mots »** : « Service après-clé », « Ça arrive — y compris à celles et ceux qui collectionnent les baux », « Une bonne gestion locative, c'est avant tout une bonne tenue des comptes — et un peu d'attention », « Reprenez là où vous vous étiez arrêté » | pages d'authentification | Textes utiles et courts : « Connexion », « Mot de passe oublié », « Entrez votre e-mail, nous vous envoyons un lien. » |
| **Tirets cadratins partout** (63 « — » dans les gabarits) et points médians « · » comme séparateurs | gabarits | Phrases courtes, ponctuation ordinaire. Le « · » seulement dans des métadonnées compactes (ex. « 3 pièces · 68 m² »). |
| **Majuscules espacées** (61 `uppercase`, 108 `letter-spacing`) : « BAIL ACTIF », petits libellés | SCSS | Réserver aux puces de statut. Libellés en casse normale. |
| **Tableaux de bord « génériques »** : bandeau de KPI, « bilan de santé », « Bienvenue chez vous, Prénom. », méta-données en ligne avec 6 icônes | `tenant/mon-logement` (`kpi-strip`, `health-check`, `home-hero`) | Écran d'accueil construit autour de **la prochaine action** (loyer du mois, document à signer, message non lu). |
| **Commentaires décoratifs** : 313 séparateurs `── … ──` dans 49 fichiers, « layout Direction C », « État 1 — Public : text-only, sans icônes » | TS, HTML, SCSS | Retirer les séparateurs et les commentaires qui paraphrasent le code ; garder ceux qui expliquent une règle métier ou de sécurité (P0-6, W13, R2…). |
| **Dégradés et ombres de mise en scène** (18 dégradés) | SCSS | Surfaces plates, une seule élévation pour les éléments flottants (feuille, barre d'onglets). |

---

## 4. Ce qui est faux ou ne fait rien (à retirer en priorité)

Une interface qui ment fait perdre la confiance plus vite qu'un manque de fonction.

| Constat | Fichier | À faire |
|---|---|---|
| **« Payer maintenant » / « Programmer auto. »** (commentés) et `onPayerMaintenant()` vers `/loc/paiement` (n'existe pas) ; texte « Paiement mensuel · virement bancaire » en dur | `tenant/mon-logement/components/next-rent/*`, `mon-logement.component.ts:101` | Supprimer : **aucun paiement ne passe par l'app** (décision 2026-10-07). Afficher le mode déclaré par le propriétaire (C8-bis) ou rien. |
| **Actions rapides vers des pages inexistantes** : « Signaler un incident » (`/loc/incidents/new`), « Demander une attestation (CAF…) », « Mettre à jour mon assurance », « Donner mon préavis » | `tenant/mon-logement/services/tenant-home.service.ts:24-55` | Supprimer celles sans fonction réelle ; garder « Voir l'EDL d'entrée », « Écrire au propriétaire ». « CAF » n'a pas de sens au Congo. |
| **4 cartes « Bientôt »** (échéances, incidents, maintenance, rappels) | `mon-logement.component.html:130-150` | Supprimer. |
| **Menu « Comment ça marche » et « Aide » grisés** (`kp-nav-item--soon`, 12 occurrences) | `principal-nav-header.component.html` | Supprimer jusqu'à ce que ces pages existent. |
| **Vue carte « bientôt disponible »** (bouton désactivé) | `biens/biens.component.html:60-63` | Supprimer, ou l'activer avec Leaflet (déjà dans le projet, C2). |
| **Badge « Vérifié »** sur le propriétaire alors que rien n'est vérifié | `bien-detail.component.html:378` | Supprimer. |
| **Profil** : bouton « Modifier » sans action, carte « Aide » sans action, **« Me déconnecter » sans action** | `account/private/profile-home/*` | Refaire l’écran Compte (section 8.4). Le bouton de déconnexion doit déconnecter. |
| **Paramètres** : civilité, date de naissance et adresse **obligatoires** mais jamais enregistrés (l'API n'a pas ces champs), « Enregistrer » sans action, choix du thème « appareil / foncé / clair » sans effet (doublon du bouton du menu) | `account/private/account-settings/*` | Garder seulement ce qui est enregistré : nom, prénom, photo, téléphone (C6), thème (branché sur `ThemeService`). |
| **« Se souvenir de moi »** : la case n'est lue nulle part | `login.component.ts:48` | Supprimer. |
| **Liens morts** `href="#"` (Aide, Confidentialité…) | 7 occurrences | Supprimer, ou pointer vers de vraies pages (CGU et confidentialité seront nécessaires pour le RGPD). |
| **Modale « logement assigné »** commentée « [STAND-BY] » | `mon-logement.component.html:1-14` | Supprimer le bloc ; le recréer quand les notifications le permettront. |

---

## 5. Code mort et dette visible

| Élément | Détail |
|---|---|
| **Composants jamais utilisés** (10) | `core/auth/pages/logout`, `features/dashboard`, `features/messagerie/messagerie.component`, `layouts/main-layout`, et dans `tenant/mon-logement/components` : `alert-card`, `coloc-list`, `doc-list`, `incident-list`, `maintenance-card`, `timeline-deadlines`. À supprimer (dossiers entiers). |
| **NgRx vide** | `store/` ne contient qu'un état `appName` et aucun effet, mais `provideStore`, `provideEffects` et `provideStoreDevtools` sont chargés (`app.config.ts`). Le projet utilise des signaux et des services (décision « pas de NgRx »). Retirer `@ngrx/*` et le dossier `store/`. |
| **Trois systèmes d'icônes** | `<mat-icon>` (62, police Material Icons chargée depuis Google), `<kp-icon>` (205) et `<lucide-icon>` (92). Ne garder que `kp-icon` (Lucide) et retirer la police Material Icons de `index.html`. |
| **Routes en double** | `/auth/register` et `/auth/signup` ; `/edl/signer/:token` et `/etats-des-lieux/signer/:token` ; `/`, `/pro`, `/pro/biens` et `/loc` affichent le même composant `BiensComponent`, qui devine son mode en lisant `router.url` dans des `computed` (non réactifs : `router.url` n'est pas un signal). |
| **`console.log`** | 5 dans `chat-store.service.ts` et `chat.service.ts` (contenu de conversations, déjà signalé côté API). |
| **Nom trompeur** | `isAdmin()` dans `principal-nav-header` veut dire « propriétaire ». |
| **Styles** | 27 tailles de police en pixels, 22 couleurs en dur, 43 attributs `style="…"`, 18 points de rupture différents (de 420 à 1280 px). Un seul jeu de jetons (`_tokens.scss`) doit tout porter. Tailwind est installé mais quasiment pas utilisé (10 gabarits) : choisir (SCSS + jetons, recommandé) et retirer l'autre. |
| **Fichiers trop gros** | `principal-nav-header` (755 lignes de SCSS + 413 de HTML, toute la navigation des 4 états dans un seul composant), `bien-detail` (631 + 388), `bien-create` (562 + 437). À découper par écran et par état. |
| **Test d'origine** | `app.spec.ts` « should render title » échoue depuis le début : à supprimer ou réécrire. |

---

## 6. Navigation et parcours

### 6.1 Constats

1. **Pas d'accueil par rôle.** Le propriétaire connecté arrive sur `/pro` = « Explorer les biens » (annonces de tout le monde). Ce qu'il doit faire (signatures en attente, loyers non déclarés reçus, nouveaux messages) n'apparaît nulle part.
2. **Deux entrées pour la même chose** : « Explorer » et « Mes biens » ouvrent le même composant ; « Contrats », « États des lieux », « Quittances » existent à la fois en pages globales (`/pro/contrats`…) et en onglets du logement (`/pro/logements/:id`). L'utilisateur ne sait pas où aller.
3. **Le détail d'une annonce exige un compte** (`/biens/:id` protégé par `authGuard`), alors que l'API sert une vue publique (`GET /biens/{id}`). Un visiteur ne peut pas regarder une annonce avant de s'inscrire.
4. **Pas de retour après connexion** : `authGuard` renvoie vers `/auth/login` sans mémoriser la page demandée (un lien reçu par e-mail ramène sur l'accueil après connexion).
5. **Pas de garde par rôle** : un locataire peut ouvrir `/pro/biens/nouveau` et ne découvre le refus qu'à l'envoi (403 de l'API).
6. **Navigation qui change de forme** selon 4 états (visiteur, propriétaire, locataire sans logement, locataire avec logement) avec des libellés différents (« Explorer », « Rechercher », « Louer ») pour la même page.
7. **Deux langages visuels** : pages « éditoriales » (annonces, auth, détail) et pages « administration » sobres (`kp-page`, contrats, EDL, quittances, documents). Les secondes sont plus proches de la cible.
8. **Formulaires longs sur une seule page de défilement** (création de bien en 4 étapes de ~560 lignes de gabarit, contrat, EDL, quittance) avec des boutons d'action en bas de page, hors de portée du pouce.

### 6.2 Architecture cible

Une navigation **fixe par rôle**, identique sur ordinateur (barre latérale) et mobile (barre d'onglets du bas).

| Rôle | Onglets (mobile : barre du bas ; ordinateur : barre latérale) |
|---|---|
| **Visiteur** | Explorer · Se connecter |
| **Propriétaire** | **Accueil** (à faire aujourd'hui) · **Biens** · **Documents** (baux, EDL, quittances, avec filtre) · **Messages** · **Compte** |
| **Locataire avec logement** | **Mon logement** (loyer du mois, documents à signer, contact du propriétaire) · **Quittances** · **Documents** · **Messages** · **Compte** |
| **Locataire sans logement** | **Explorer** · **Messages** · **Compte** |

- « Explorer » (annonces publiques) reste accessible au propriétaire depuis l'écran Biens (lien secondaire), pas comme onglet.
- Le **logement** (fiche d'un bien du propriétaire) devient une **pile** : Biens → fiche du bien (photos, locataire, loyer, actions) → Bail / EDL / Quittances. Les pages globales `/pro/contrats`, `/pro/etats-des-lieux`, `/pro/quittances` fusionnent dans l'onglet **Documents**.
- Une seule route par écran, des noms stables (`/biens`, `/biens/:id`, `/documents`, `/messages`, `/compte`), et le rôle décidé par des gardes (`roleGuard`), pas par l'URL.
- Retour automatique à la page demandée après connexion (`returnUrl`).

---

## 7. Mobile : constat

- **Barre du haut + tiroir** (`kp-drawer`) : modèle « site web ». Aucun onglet du bas.
- **`height: calc(100vh - 56px)`** (messagerie) : sur iOS et Android, `100vh` inclut la barre d'adresse → zone de saisie cachée sous le clavier ou coupée. Utiliser `100dvh` et `visualViewport`.
- **Aucune zone sûre** : ni `viewport-fit=cover`, ni `env(safe-area-inset-*)`. En PWA installée (R2), le contenu passe sous l'encoche et la barre de geste.
- **Menus et sélecteurs de bureau** (`mat-menu`, `mat-select`, `mat-datepicker`, modales maison) au lieu de feuilles du bas.
- **Grilles qui se réduisent** (18 points de rupture) au lieu d'écrans pensés pour 360-430 px de large.
- **Cibles tactiles** non garanties (boutons-icônes de 15-16 px dans `biens.component`, liens texte dans les cartes).
- **Pas d'`inputmode`** sur les champs numériques et téléphone (clavier complet au lieu du pavé numérique) ; sélecteur de date Material au lieu du sélecteur natif.
- **Pas d'état « tirer pour actualiser »**, pas de squelettes cohérents (certains écrans en ont, d'autres un spinner).

---

## 8. Cible : principes de design

### 8.1 Ton et contenu

- **Une idée par écran, un bouton principal par écran.**
- Textes d'interface **courts, concrets, au présent** : « Loyer d'octobre reçu », « 2 documents à signer », « Écrire au propriétaire ».
- Aucun texte de remplissage, aucune métaphore, aucun jeu de mots, aucune promesse de fonction future.
- Vocabulaire unique : « bien » (jamais « logement » côté propriétaire et « bien » ailleurs), « bail » (plutôt que « contrat » dans l'interface), « état des lieux », « quittance », « messages ».
- Montants toujours avec leur devise (`montant` pipe), dates relatives quand c'est utile (« dans 3 jours »).
- Deux pays : aucun texte propre à la France en dur (CAF, virement, code postal) hors du profil de juridiction.

### 8.2 Système visuel

- Palette conservée (Night `#10212B`, Olive `#8FA464`, Mint `#EFFBDB`), mais **appliquée avec retenue** : fond clair neutre, Night pour le texte et la barre d'onglets, Olive pour l'action principale et les états « fait », une couleur d'alerte et une d'erreur.
- **Typographie** : DM Sans pour toute l'interface ; DM Serif Display seulement pour le nom de l'app et éventuellement le titre d'accueil, jamais en italique décoratif. Échelle de 6 tailles maximum (ex. 12 / 14 / 16 / 20 / 24 / 32).
- **Une grille d'espacement** (4 px), trois rayons (8, 12, 20), une élévation.
- **Icônes Lucide uniquement**, 20-24 px, trait constant.
- Mode sombre complet par jetons (déjà amorcé dans `_dark-theme.scss`), suivant le réglage du système par défaut.

### 8.3 Mobile « comme une app native »

Composants à construire (un dossier `shared/mobile/` ou équivalent) :

| Widget | Usage |
|---|---|
| **Barre d'onglets du bas** (4-5 onglets, icône + libellé, pastille de non-lus) | navigation principale ; fixe, au-dessus de la zone sûre |
| **Grand titre qui se replie** en barre de navigation au défilement, avec chevron de retour | en-tête de chaque écran |
| **Feuille du bas** (bottom sheet) avec poignée, glisser pour fermer | filtres, choix (pays, devise, mode de paiement), actions d'un document, menu du compte, confirmation |
| **Liste groupée** (style réglages iOS / Material list) avec lignes de 56 px, chevron, valeur à droite | compte, fiche d'un bien, détails d'un bail |
| **Actions par balayage** sur une ligne de liste | marquer une quittance « reçue », archiver une notification |
| **Bouton d'action flottant** (FAB) ou bouton principal collé en bas | « Nouveau bien », « Signer », « Déclarer le loyer reçu » |
| **Contrôle segmenté** | Documents : Baux / EDL / Quittances ; Biens : Loués / Vacants |
| **Tirer pour actualiser** | listes (biens, documents, messages) |
| **Squelettes** uniformes | tout chargement |
| **Toast / snackbar** au-dessus de la barre d'onglets | confirmation d'action, erreur réseau |
| **Formulaire pas à pas plein écran** : une question ou un groupe court par écran, barre de progression fine, bouton « Continuer » collé en bas au-dessus du clavier | création de bien, bail, EDL, quittance, inscription |
| **Signature plein écran en paysage** | signature d'un bail ou d'un EDL |
| **Galerie photo plein écran** avec balayage et compteur « 3/12 » | annonce |
| **Bandeau hors ligne** discret sous la barre de titre | déjà fait (R2), à intégrer au style |

Règles techniques :
- `viewport-fit=cover` + `env(safe-area-inset-*)` sur la barre d'onglets, les feuilles et les boutons collés en bas ; `100dvh` ; `overscroll-behavior` sur les listes ; `touch-action` sur la signature.
- Cibles tactiles **≥ 44 × 44 px**, espacement ≥ 8 px.
- `inputmode="numeric"` / `"decimal"` / `"tel"`, `autocomplete` correct, sélecteurs natifs (`<input type="date">`, `<select>`) sur mobile.
- Transitions de pile (glissement horizontal à l'ouverture d'un écran, vers le bas pour une feuille), 200-250 ms, désactivées si `prefers-reduced-motion`.
- Aucune interaction qui dépend du survol.
- Écran de démarrage et icônes de la PWA aux couleurs de Kupanga (icônes actuelles provisoires).

### 8.4 Écrans clés (contenu attendu)

- **Accueil propriétaire** : cartes « À faire » triées par urgence (signature en attente du locataire, loyer du mois non déclaré reçu, EDL à faire, message sans réponse), puis la liste courte des biens avec leur statut. Rien d'autre.
- **Mon logement (locataire)** : carte « Loyer d'octobre » (montant, échéance, statut reçu/en attente), documents à signer, contact du propriétaire (message, appel, WhatsApp), adresse et repère.
- **Fiche d'un bien (propriétaire)** : photos, statut (loué/vacant), locataire (avec contact), loyer et devise, raccourcis Bail / EDL / Quittances, « Modifier », « Archiver » dans une feuille d'actions.
- **Annonce (public)** : galerie, prix et devise, quartier/commune, caractéristiques en liste, équipements en puces, propriétaire (prénom + initiale), bouton collé en bas « Contacter ».
- **Documents** : contrôle segmenté, lignes avec statut (puce colorée) et action principale ; ouverture du PDF en plein écran.
- **Messages** : liste avec photo, nom, aperçu, heure, pastille ; conversation plein écran, zone de saisie collée au clavier, statut d'envoi (en attente / échec + réessayer, déjà géré W13).
- **Compte** : liste groupée (profil, téléphone, thème, notifications, CGU, confidentialité, déconnexion en rouge).

### 8.5 Ordinateur

Même architecture : barre latérale gauche (onglets du rôle), contenu centré (max 1200 px), listes en tableau ou en grille selon l'écran, feuilles du bas remplacées par des panneaux latéraux ou des boîtes de dialogue.

---

## 9. Plan de travail proposé

| Étape | Contenu | Taille |
|---|---|---|
| **1. Nettoyage** (sans changer le design) | Section 4 et 5 : retirer les faux boutons, « Bientôt », badge « Vérifié », actions inexistantes, composants morts, NgRx, `console.log`, icônes Material ; brancher la déconnexion ; corriger `router.url` et les routes en double ; `returnUrl` ; gardes par rôle ; annonce publique sans compte | 1-2 jours |
| **2. Prototype navigable** | Avec `PROMPT-MAQUETTES.md` : toute l'application cliquable, les 11 parcours jouables de bout en bout, sur petit téléphone, téléphone, tablette et ordinateur, clair et sombre, validé avant de coder | 2-3 jours + validation |
| **3. Socle visuel** | Jetons (couleurs, typo, espacements, rayons), composants mobiles (section 8.3), mise en page à onglets, zones sûres | 3-4 jours |
| **4. Écrans** | Par rôle : propriétaire (accueil, biens, fiche, documents), locataire (mon logement, quittances), messages, compte, authentification, formulaires pas à pas | 6-10 jours |
| **5. Recette** | Android d'entrée de gamme (Chrome) et iPhone (Safari, PWA installée), réseau lent (3G simulée), lecteur d'écran, mode sombre | 1-2 jours |

Contraintes à garder pendant la refonte : contrats d'API inchangés, comportements de sécurité du front (intercepteur, routes publiques, cache hors ligne par compte R2, vidage à la déconnexion), formats multi-pays (`GET /juridictions/{pays}`), tests existants.

---

## 10. État de la refonte (2026-10-13)

Étapes 1, 3 et 4 du plan faites directement dans le code (étape 2, le prototype, sautée à la demande du propriétaire du projet). Non commité.

- **Nettoyage** : NgRx, Tailwind, Angular Material, police Material Icons, `console.log`, composants morts, faux boutons, « Bientôt », badge « Vérifié », « Payer », actions vers des pages inexistantes, avatars prédéfinis supprimés. Une seule famille d'icônes (`kp-icon`, Lucide), une seule source de styles (`src/styles/` : `_theme.scss` jetons clair/sombre, `_base.scss`, `_components.scss`, `_mq.scss` à deux points de rupture).
- **Navigation par rôle** (§6.2) : `layouts/app-shell` (onglets du bas sur téléphone, barre latérale ailleurs), `core/navigation/navigation.service.ts` ; routes stables (`/explorer`, `/annonces/:id`, `/accueil`, `/biens/...`, `/documents`, `/mon-logement`, `/quittances`, `/messages`, `/compte`, `/notifications`), gardes `authGuard` (avec `returnUrl`), `roleGuard`, `accueilGuard`, `invitesGuard` ; anciennes adresses redirigées. Annonce publique sans compte.
- **Composants mobiles** (§8.3, `shared/ui/`) : en-tête à grand titre repliable, feuille du bas / boîte de dialogue, contrôle segmenté, assistant pas à pas plein écran, signature au doigt (pointeur, taille plafonnée pour l'API), galerie plein écran, tirer pour actualiser, messages éphémères, squelettes, états vides. Zones sûres, `100dvh`, `inputmode`, sélecteurs natifs.
- **Écrans** : connexion, inscription en 3 étapes, mot de passe, confirmation ; Explorer (liste, carte Leaflet, filtres en feuille, filtres dans l'URL) ; annonce ; accueil propriétaire « À faire » ; biens ; fiche d'un bien ; bail, état des lieux, quittances (et leurs assistants) ; documents ; mon logement ; mes quittances ; messages ; notifications ; compte ; signature publique ; 404.
- **Vérifié** : `ng build` sans avertissement (462 Ko initial, 131 Ko transférés), `ng test` 73/73.
- **Reste** : étape 5 (recette sur appareils réels), icônes PWA définitives, pages CGU / confidentialité (RGPD).
