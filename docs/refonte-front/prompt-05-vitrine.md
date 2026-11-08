# Prompt · Phase 5 · Vitrine et écrans sans maquette

> À donner tel quel à une nouvelle session de Claude Code ouverte dans `kupanga/kupanga-front`.

---

Tu réalises la **phase 5 sur 6** de la refonte UX/UI du front Kupanga (Angular 20, composants autonomes, signaux). Les phases 1 à 4 ont posé le design system, la navigation par profil et les écrans propriétaire, locataire, candidat et signature. Cette phase refait la **vitrine publique** (landing, Explorer, page annonce France / RDC / propriétaire) et applique le design system aux **écrans sans maquette**. Elle termine en **retirant les alias** des anciens jetons.

## Règles (non négociables)

- **Ne touche pas au back.** Aucun fichier de `../kupanga-Api/`.
- **Logique métier intacte.** Mêmes routes, mêmes appels API, mêmes données, mêmes règles de validation, mêmes guards. Les filtres d'Explorer restent synchronisés avec l'adresse (`lireFiltres(params)`) : une URL partagée doit donner la même recherche qu'avant.
- **Rien d'inventé.** N'affiche que les champs présents dans la **vue publique** d'un bien (P0-6 : prénom et initiale du propriétaire, position arrondie à 100 m par l'API…). Si la maquette montre davantage (par exemple l'adresse complète sur `Annonce-Proprio`), vérifie ce que l'API renvoie à ce compte avant de l'afficher.
- **Pas d'installation.** Edge à la place de Chrome.
- **Données** : n'envoie aucun message (« Contacter » s'ouvre, mais rien n'est envoyé), ne modifie aucun bien. Pas de `git push`.

## Branche

Continue sur `refonte-front` : `git checkout refonte-front`. Le dernier commit doit être `docs(refonte): points ouverts des phases 3 et 4 tranchés` et l'arbre doit être propre. Sinon, arrête-toi et signale-le.

## À lire avant de commencer

1. `docs/refonte-front/00-vue-ensemble.md` : décisions « Thomas Petit » → « Inès Moreau » et « RDC par défaut », **points tranchés avant la phase 5**, table des jetons (alias à retirer), évolutions, suivi.
2. `../frontend-audit/livraison-dev.md` : lignes « Landing », « Explorer », « Annonce » et paragraphe « Sans maquette ».
3. Maquettes (PNG puis HTML dans `../frontend-audit/maquettes/`) : `O1v2-Landing`, `O1v2-Explorer`, `Annonce-France`, `Annonce-RDC`, `Annonce-Proprio`.
4. L'existant : `../frontend-audit/documentation/cartographie-ecrans.md` (landing, Explorer, annonce, connexion, compte, documents, notifications, pages légales, page introuvable), `../frontend-audit/documentation/synthese-recommandations.md` (restes de l'ancien modèle à rôles) et `../frontend-audit/screenshots/`.
5. Le code :
   - `src/app/features/landing/*` (+ spec) ;
   - `src/app/features/explorer/*` : `explorer`, `annonce`, `carte-annonces` ;
   - `src/app/shared/components/carte-repere/`, `src/app/shared/ui/galerie.component.ts`, `lieux-proches.component.ts` ;
   - `src/app/core/auth/pages/*` et `src/app/core/auth/ui/*` ;
   - `src/app/features/compte/*`, `documents/*`, `notifications/*`, `legal/*` (+ spec), `erreur/*` ;
   - `src/styles/_theme.scss` (bloc `// ALIAS À RETIRER (phase 5)`).

## Écrans à réaliser

### 1. Landing · `/` · maquette `O1v2-Landing`

Fichiers : `features/landing/landing.component.{ts,html,scss,spec.ts}`.

- Barre publique en pilule : logo SVG ; Annonces (`/explorer`) · Comment ça marche · France et RDC. Ces deux dernières sont des **ancres de la page** (fragments), pas de nouvelles routes. À droite : connexion et création de compte, ou « Mon espace » + avatar si connecté.
- Titre « Louez entre particuliers, de l'annonce au bail signé » (taille landing, clamp 40–56 px, −0,03 em), sections et textes de la maquette.
- **Bascule France / RDC** (contrôle segmenté) qui change l'annonce d'exemple et les champs mentionnés (DPE et code postal en France ; commune, quartier, point de repère en RDC). **La RDC est sélectionnée par défaut** (décision).
- Le contact d'exemple « Thomas Petit » devient **« Inès Moreau »**, avec les initiales **IM** (décision).
- Le nom « kupanga » n'est jamais écrit en texte dans l'en-tête : c'est `kp-logo`.
- **Vidéo de démo** : la landing actuelle a une vidéo (dernier commit de `feature/pret-pour-la-prod`, façade `.affiche` qui ne charge YouTube qu'au clic, testée dans la spec). **La maquette n'en montre pas.** Décision : elle est **gardée**, dans une section restylée cohérente avec la maquette (façade `.affiche` et chargement de YouTube au clic inchangés).
- **Spec** `landing.component.spec.ts` :
  - le test du `h1` attend « De l'annonce à la fin du bail ». Le titre change d'après la maquette : mets le test à jour avec le nouveau texte et **signale-le** ;
  - les liens `a[href="/auth/register"]` et `a[href="/explorer"]` doivent rester ;
  - les tests de la vidéo (pas d'`iframe` avant lecture, `.affiche` présent) et du **thème clair forcé** sur la landing restent valides.
- Remplace les 11 couleurs en dur de `landing.component.scss` et les usages de `--kp-font-display`.

### 2. Explorer · `/explorer` · maquette `O1v2-Explorer`

Fichiers : `features/explorer/explorer.component.{ts,html,scss}`, `carte-annonces.component.ts`.

- Liste et carte côte à côte. **La carte reste fixe pendant que la liste défile** (`position: sticky` sur la colonne carte, hauteur calée sur la fenêtre moins la barre).
- Filtres en pilules. Les filtres actifs et le nombre de filtres sont ceux du code actuel (`filtres`, `VIDES`, compteur de filtres actifs).
- Affichage **Liste et carte / Liste / Carte** en contrôle segmenté. Le code a déjà `vue = signal<Vue>('liste')` et `vues: OptionSegment<Vue>[]` : le code n'a que `'liste' | 'carte'`. Décision : ajoute « Liste et carte » et fais-en la valeur par défaut **sur ordinateur** ; sur téléphone, garde la bascule actuelle. Les filtres restent dans l'adresse ; n'y ajoute la vue que si elle y est déjà.
- Annonce sélectionnée **cerclée d'olive** dans la liste ; **prix en nuit** sur les marqueurs de la carte (`carte-annonces.component.ts`, divIcon Leaflet). Survoler une carte de la liste met en avant son marqueur, et l'inverse si le code le permet sans changer les appels.
- Position publique arrondie à 100 m : déjà faite par l'API (`BienMapper.arrondiPublic`), aucun calcul côté front.

### 3. Annonce · `/annonces/:id` · maquettes `Annonce-France`, `Annonce-RDC`, `Annonce-Proprio`

Fichiers : `features/explorer/annonce.component.{ts,html,scss}`.

- **Même gabarit pour les deux pays** : fil « ‹ Retour aux annonces », titre, ville et type ; **mosaïque de photos** (une grande et quatre petites, « Voir les N photos » sur la dernière, ouvrant `galerie`) ; colonne principale avec Caractéristiques, Conditions, Équipements, lieux à moins de 5 km, Description et Adresse avec carte ; à droite, **carte collée** avec prix par mois, charges, disponibilité, propriétaire (prénom + initiale) et « Contacter ».
- **France** : DPE et GES **dessinés** (échelles A à G avec la classe mise en avant, `classeEnergie` et `classeGes`), conditions avec le dépôt de garantie.
- **RDC** : courant (`heuresElectriciteParJour`), garantie en mois + loyers d'avance (`garantieMois`, `avanceMois`), point de repère. Ces libellés suivent la juridiction (`juridiction.service.ts`).
- **Annonce vue par son propriétaire** (`Annonce-Proprio`) :
  - bannière nuit « C'est votre annonce, telle que la voient les visiteurs », avec « Retour à la fiche » (`/biens/:id`) et « Modifier le bien » (`/biens/:id/modifier`) ;
  - à la place de « Contacter », « Voir les messages reçus » (`/messages`), et la mention « Les visiteurs voient ici le bouton « Contacter » ».
  - Cela corrige le point de l'audit « le propriétaire voit Contacter sur sa propre annonce ». **Piège** : la vue publique (`BienService.getPublic`) n'a ni l'identifiant ni l'e-mail du propriétaire, on ne peut pas comparer `bien().proprietaire` au compte. Décision : pour un compte connecté qui possède des biens (`LogementContextService.aDesBiens()`), appelle aussi `BienService.getPrive(id)` (déjà utilisé par `messages.component.ts`) en ignorant son erreur (403 si le bien n'est pas à lui). Réponse reçue et `proprietaire.id` égal à `auth.currentUser().id` : vue propriétaire, avec l'adresse complète de la vue privée. Visiteur, candidat, locataire : aucun appel de plus. Signale cet appel dans le rapport.
- « Contacter » : comportement inchangé (`contacter()`, connexion demandée si visiteur).

### 4. Écrans sans maquette

Applique les jetons et les composants **sans changer l'organisation** :

- connexion, inscription (+ choix du rôle et Google), mot de passe oublié, nouveau mot de passe, confirmation de l'e-mail (`core/auth/pages/*`, `auth-layout`) ;
- Documents (`/documents`), Compte (`/compte`), Notifications (`/notifications`) ;
- pages légales (`/confidentialite`, `/conditions` : `page-legale.component.ts` utilise `--kp-font-display`) ;
- page introuvable ;
- Demandes de location (`/demandes-location`, si ce n'est pas déjà fait en phase 4).

Points particuliers :

- **Compte** : la carte du compte affiche encore le rôle (« Propriétaire », `compte.component.html:11`, `role()`), un reste du modèle à rôles relevé par l'audit. Retire cet **affichage** et garde le reste. Le champ `role` reste dans les modèles et dans l'inscription (choix « louer / mettre en location »), où il sert toujours.
- **Compte → Thème** : la feuille Clair / Sombre / Système reste.

### 5. Compléments décidés le 7 novembre 2026

- **« Mon logement » actif sur `/quittances`** (barre du haut du locataire, ordinateur, et onglets du bas sur téléphone). Aujourd'hui, `routerLinkActive` ne marque l'onglet que sur `/mon-logement`, alors que l'en-tête de Mon logement montre « Quittances » actif. Ajoute à `Onglet` (`core/navigation/navigation.service.ts`) une liste facultative d'adresses où l'onglet reste actif (par exemple `aussi: ['/quittances']` pour `MON_LOGEMENT`, **profil locataire seulement** : pour un propriétaire qui loue aussi, « Quittances » a sa propre entrée). Aucune route ni aucun appel nouveaux ; ajoute un test au `navigation.service.spec.ts` (ou au composant de barre).
- **Conversations sur l'accueil propriétaire** (`Nav-Proprio-Tableau`) : une lecture `ChatService.searchConversations({ page: 0, size: 20, lu: null, sortBy: 'lastMessageAt', sortDirection: 'DESC' })`, comme l'accueil candidat (phase 4), **seulement pour le profil propriétaire**. « N conversations en cours » sous « Annonces en ligne », et « N personnes vous ont écrit » sur la ligne d'un bien vacant (regroupement par `bienId`, une personne = un interlocuteur) ; au-delà de 20 conversations, « plus de 20 », comme la fiche du bien. Erreur de lecture : rien d'affiché, pas de message. Aucun changement de `calculerTaches()` (règles de tâches : évolution F1).

### 6. Retrait des alias et nettoyage

- Remplace dans tout `src/` les anciens noms de jetons par les nouveaux (table de `00-vue-ensemble.md`), puis **supprime le bloc d'alias** de `_theme.scss`, dans le clair comme dans le sombre.
- Supprime `--kp-font-display` et les derniers `--kp-space-5` / `--kp-space-10` s'ils peuvent passer sur la grille (20 → 16 ou 24, 40 → 32 ou 48, selon la maquette la plus proche).
- Grep final : aucune couleur hexadécimale hors de `_theme.scss`, sauf exceptions justifiées (tuiles de carte, couleurs DPE et GES réglementaires si tu en fais des jetons dédiés), et aucune occurrence de `DM Sans` ou `DM Serif`.
- `design-system.yml` à la racine (palette « Olive #8FA464 ») : décision, **les deux**. Mets-le à jour avec les nouveaux jetons (couleurs clair et sombre, Figtree, tailles, rayons, espacements, ombres) et ajoute en tête une mention : la table des jetons de `00-vue-ensemble.md` et `src/styles/_theme.scss` font foi.

## Pièges et risques de régression repérés

- **Thème forcé** : la landing s'affiche en clair même si l'appareil est en sombre, puis rend la main en partant (test existant). Garde ce comportement.
- **Leaflet** : `leaflet.css`, `invalidateSize()` quand la carte change de taille (bascule de vue, colonne collante), marqueurs `divIcon` avec couleurs en dur (`carte-annonces.component.ts`, `carte-repere.component.ts`) à passer en jetons, sans casser les tests de `carte-repere.component.spec.ts` et `carte-bien.component.spec.ts`.
- **Vue publique** (P0-6) : pas d'e-mail ni de téléphone du propriétaire dans l'annonce.
- **Bouton principal** : olive partout (décision du 7 novembre), même quand une maquette montre un bouton nuit.
- **Visiteur** : Explorer et Annonce sont publics. « Contacter » renvoie à la connexion avec `returnUrl`, comportement à garder.
- **Pages légales** : adresses déclarées à Google (écran de consentement OAuth). Elles ne changent pas, et `pages-legales.spec.ts` doit passer.
- **SEO et titres** : `title` des routes inchangés.
- **Retrait des alias** : c'est le commit le plus risqué. Fais un remplacement par fichier, vérifie le build et les tests, et fais une passe visuelle rapide de **tous** les écrans en clair et en sombre avant de supprimer le bloc.

## Commits attendus (dans cet ordre, build vert à chaque fois)

1. `feat(vitrine): landing, bascule France / RDC (RDC par défaut) et logo SVG`
2. `feat(vitrine): Explorer, liste et carte côte à côte avec carte fixe`
3. `feat(vitrine): page annonce, mosaïque de photos et carte collée`
4. `feat(vitrine): DPE et GES dessinés, conditions France et RDC`
5. `feat(vitrine): annonce vue par son propriétaire`
6. `style(auth): jetons et composants sur la connexion, l'inscription et le mot de passe`
7. `style(app): jetons et composants sur Documents, Compte, Notifications, pages légales et page introuvable`
8. `fix(compte): retrait de l'affichage du rôle hérité de l'ancien modèle`
9. `fix(nav): « Mon logement » actif sur les quittances du locataire`
10. `feat(proprietaire): conversations en cours sur l'accueil`
11. `refactor(ds): anciens noms de jetons remplacés dans tout le code`
12. `refactor(ds): suppression des alias et des couleurs en dur restantes`
13. `docs(refonte): bilan de la phase 5`

Messages en français, format Conventional Commits. Ajoute la ligne `Co-Authored-By` si ton environnement en demande une. Avant chaque commit : `npm run build -- --configuration production`.

## Vérifications de fin de phase

1. **Build** : `npm run build -- --configuration production`. Compare la taille des paquets avec la phase 4 et signale une hausse notable.
2. **Tests existants avec Edge** : tous passent.
   ```powershell
   $env:CHROME_BIN = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
   npx ng test --watch=false --browsers=ChromeHeadless
   ```
3. **Application utilisable** : API locale et `npm start`.
   - Visiteur : landing (bascule RDC / France, vidéo), Explorer (filtres, trois vues, URL partagée), annonce France et annonce RDC, « Contacter » vers la connexion.
   - `claire.martin@kupanga.dev` : sa propre annonce (bannière, « Voir les messages reçus »).
   - Connexion avec un mauvais mot de passe (message d'erreur), Compte et thème, Documents, Notifications, pages légales, une adresse inconnue.
   - Ordinateur et téléphone, clair et sombre.
4. **Comparaison aux maquettes** : captures Edge headless par CDP (script Node 24 dans ton dossier temporaire) à 1440 px et 390 × 844, lues côte à côte avec Read.
   - Landing → `O1v2-Landing` (page entière).
   - Explorer → `O1v2-Explorer`.
   - Annonce France → `Annonce-France`.
   - Annonce RDC → `Annonce-RDC`.
   - Annonce vue par sa propriétaire → `Annonce-Proprio`.
5. **Revue globale** : un passage rapide sur tous les écrans des phases 1 à 4 après le retrait des alias, en clair et en sombre.
6. **Écarts restants**, écran par écran, avec leur raison.

## Rapport de fin de phase (à me donner, court)

- Commits (hash court + message).
- Build (et taille), tests (X sur Y), parcours vérifiés.
- Écarts avec les maquettes et pourquoi.
- Décisions à prendre : entrée « Demandes de location », et tout nouveau point découvert.
- Évolutions découvertes (ajoutées dans `00-vue-ensemble.md`).
- Ce que fera la phase 6.

**Arrête-toi là.** N'enchaîne pas sur la phase 6.
