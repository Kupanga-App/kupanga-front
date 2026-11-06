# Refonte du front Kupanga · Vue d'ensemble

Préparé le 6 novembre 2026. Ce dossier sert de référence commune aux six sessions de travail (un prompt par phase, `prompt-0X-*.md`). Chaque session lit ce fichier avant de commencer.

## Périmètre

La refonte change **l'apparence et l'organisation des écrans** du front Angular (`kupanga-front`) : nouvelle direction visuelle, design system `--kp-*`, police Figtree, nouveau logo, navigation par profil, écrans revus d'après les maquettes.

Elle ne change **ni le back ni la logique métier**.

## Règles absolues

1. **Front uniquement.** Aucun fichier de `kupanga-Api/` n'est modifié : pas de serveur, pas d'API, pas de schéma de données.
2. **Logique métier intacte.** Mêmes appels API (mêmes adresses, mêmes corps, mêmes paramètres), mêmes données, mêmes routes (`src/app/app.routes.ts`), mêmes règles de validation, mêmes droits (guards). Les services (`*.service.ts`), modèles (`*.model.ts`) et fonctions de calcul (`taches.ts`, `montant.ts`, `api-error.ts`, `telephone.ts`, `photos.ts`…) ne changent pas, sauf exception écrite dans les décisions ci-dessous.
   Un écran peut réutiliser une méthode de service **déjà appelée ailleurs dans le front** (par exemple la liste des conversations sur la fiche du bien). Un endpoint que le front n'appelle pas encore ne s'ajoute pas sans accord. Une règle de validation actuelle (`Validators` des formulaires) ne s'assouplit ni ne se durcit, même si une maquette montre autre chose : on garde le code et on signale l'écart.
3. **Rien d'inventé.** Un écran qui demande une donnée ou un comportement que l'API ne fournit pas (« Évolution ») n'est pas construit avec des données fictives : on l'omet, on le note dans le rapport de phase et dans la liste des évolutions ci-dessous.
4. **Adresses e-mail figées.** Les routes utilisées dans les e-mails de l'API ne changent pas : `/auth/login`, `/auth/forgot`, `/auth/reset-password`, `/auth/verifier-email`, `/contrats/signer/:token`, `/edl/signer/:token`.
5. **Branche.** Tout se fait sur `refonte-front`, créée par la phase 1 à partir de `feature/pret-pour-la-prod`. Rien n'est poussé sur une autre branche. Pas de `git push` sans accord explicite.
6. **Pas d'installation sans accord**, sauf Playwright en phase 6 (déjà validé). Pas de Chrome sur le poste : on utilise Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
7. **Données.** Ne créer, modifier ou supprimer aucune donnée métier (bien, bail, état des lieux, quittance, demande, message) sans demander. Les assistants se parcourent jusqu'à l'écran de vérification sans cliquer sur l'action finale.
8. **Commits.** Petits, ordonnés, Conventional Commits en français ; un commit = un changement cohérent ; jamais deux phases dans un commit ; chaque commit laisse le build vert. Terminer chaque message par la ligne `Co-Authored-By` demandée par l'environnement s'il y en a une.

## Références

| Ressource | Chemin (depuis `kupanga-front/`) |
| --- | --- |
| Doc de livraison (référence principale) | `../frontend-audit/livraison-dev.md` |
| Maquettes (cible visuelle) | `../frontend-audit/maquettes/png/` |
| Maquettes (valeurs exactes) | `../frontend-audit/maquettes/html/` |
| Logo, favicon, icônes PWA | `../frontend-audit/identite/kupanga-logo/` |
| Existant, écran par écran | `../frontend-audit/documentation/cartographie-ecrans.md`, `../frontend-audit/screenshots/` |
| Lancer l'API en local, comptes de test | `../kupanga-Api/GUIDE-DEMARRAGE.md` (mot de passe commun `Kupanga-Dev-2026`) |

Comptes de démo utiles : `claire.martin@kupanga.dev` (propriétaire France, 6 biens dont 1 loué à Lucas), `patrick.mbuyi@kupanga.dev` (propriétaire RDC), `lucas.bernard@kupanga.dev` (locataire France), `grace.mukendi@kupanga.dev` (locataire RDC), `ines.moreau@kupanga.dev` (candidate sans logement).

## Commandes de vérification

Depuis `kupanga-front/` :

```powershell
# Build de production (celui de la CI : .github/workflows/deploy.yml)
npm run build -- --configuration production

# Tests unitaires existants avec Edge (Karma lance « Chrome », on lui donne Edge)
$env:CHROME_BIN = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npx ng test --watch=false --browsers=ChromeHeadless
```

État de référence avant refonte (6 novembre 2026, branche `feature/pret-pour-la-prod`) : **119 tests sur 119 passent** avec Edge 156.

Comparaison aux maquettes (phases 1 à 5, sans rien installer) : Edge headless piloté par le protocole CDP avec Node 24 (`fetch` et `WebSocket` natifs). Scripts dans le dossier temporaire de la session, jamais dans le dépôt. Fenêtres de capture : **1440 px de large** pour l'ordinateur (largeur des PNG de référence), **390 × 844** pour le téléphone. La phase 6 reprend ces comparaisons avec Playwright.

## Décisions

### Points ouverts tranchés par le code

| Point | Décision | Vérification |
| --- | --- | --- |
| Correspondance des jetons | Table ci-dessous. En phase 1, les anciens noms deviennent des **alias** des nouveaux dans `src/styles/_theme.scss` : toute l'application bascule d'un coup sans casse ; les alias sont retirés au fil des phases, puis supprimés en fin de phase 5. | 57 jetons `--kp-*` relevés dans `src/` |
| PDF sur la page de signature | L'API expose `urlPdf` (contrat et état des lieux). C'est une URL signée qui **expire au bout de quelques minutes** : au clic sur « Télécharger le PDF », relancer le même `GET /contrats/signer/{token}` (ou `/etats-des-lieux/signer/{token}`) puis ouvrir le `urlPdf` frais. | `ContratDTO.urlPdf`, `DocumentPdfUrlMapper` |
| Aperçu du bail (Signer-Bail, Assist-Bail) | Construit avec les champs du contrat ou du formulaire : parties, logement (`adresseBien`), durée, loyer et charges, dépôt / garantie et avance (RDC). Le texte complet reste dans le PDF. | `ContratDTO` n'a pas de texte de bail |
| Signature du bailleur sur la page de signature | « Signé par {prénom nom} le {date} » (`proprietaireASigné`, `dateSignatureProprietaire`) à la place de la signature dessinée. | Pas d'image de signature dans `ContratDTO` |
| 404 / 410 / 409 | Écran `Signer-Lien-Invalide` avec un message distinct : 404 lien inconnu, 410 lien expiré, 409 déjà signé. La fonction `messageLienSignature` (`src/app/core/http/api-error.ts:60`) reste la source des messages ou est complétée sans changer sa logique. | `ContratServiceImpl.java:247-251`, `EtatDesLieuxServiceImpl.java:246` |
| Photos de l'état des lieux | **Non construites** (évolution serveur). Le bloc « Photos de la pièce » des maquettes `Assist-EDL` et `Assist-EDL-Mobile` est omis. | `PieceEdlFormDTO` / `ElementEdlFormDTO` sans champ photo |

### Points tranchés par Gédéon (6 novembre 2026)

| Point | Décision |
| --- | --- |
| Case « J'ai lu… » | Ajoutée sur les pages de signature par lien (bail et état des lieux), côté écran seulement. Le bouton « Signer » reste désactivé tant qu'elle n'est pas cochée. Aucun champ envoyé à l'API. |
| Thème sombre | **Conservé.** Les nouveaux jetons sont déclinés en sombre à partir de la palette sombre actuelle (`@mixin sombre` de `_theme.scss`). Le choix Clair / Sombre / Système de la page Compte et `theme.service.ts` restent tels quels. |
| Accueil locataire | La planche `Nav-Locataire` est **retirée**. Un compte qui loue un logement **et ne possède aucun bien** arrive directement sur `/mon-logement` (voir la note ci-dessous). |
| « Thomas Petit » sur la landing | Remplacé par **« Inès Moreau »** (initiales IM). |
| Landing | La **RDC** est sélectionnée par défaut dans la bascule France / RDC. L'ordre des lots ne change pas, la Vitrine reste en dernier. |
| Tests e2e | **Playwright** (`@playwright/test` en dépendance de développement), avec Edge (`channel: 'msedge'`, sans téléchargement de navigateur). Installé en phase 6 seulement. |

**Note sur la redirection du locataire.** Aujourd'hui, tous les comptes connectés vont sur `/accueil` : `accueilPour()` (`src/app/core/auth/guards/auth.guard.ts`) ne connaît plus de rôle depuis le lot 3. Envoyer le locataire sur `/mon-logement` demande donc une petite modification de cette fonction de navigation, sans nouvelle route ni nouvel appel API. On s'appuie sur les données déjà chargées par `accueilGuard` via `LogementContextService.charger()` : un logement loué et aucun bien possédé mène à `/mon-logement` ; tous les autres cas restent sur `/accueil`. La phase 2 réalise ce changement.

### Profils de navigation (pas de rôle par compte)

Depuis le lot 3, un compte n'a plus de rôle. Le profil de navigation se **déduit** de `LogementContextService`, qui est déjà en place :

| Profil | Condition | Ordinateur | Téléphone (onglets du bas) |
| --- | --- | --- | --- |
| Propriétaire | `aDesBiens()` | Barre latérale fixe : Accueil · Mes biens · Messages · Documents ; en bas « Voir les annonces » (`/explorer`) + carte du compte (`/compte`) + cloche | Accueil · Mes biens · Messages · Documents · Compte |
| Propriétaire qui loue aussi | `aDesBiens()` et `hasLogement()` | Barre latérale propriétaire + entrées « Mon logement » et « Quittances » | Comme propriétaire ; Mon logement reste joignable depuis l'accueil |
| Locataire | `hasLogement()` sans bien | Barre du haut collante, comme dans les maquettes `Mon-Logement*` : Accueil · Mon logement · Explorer ; cloche, puis avatar + nom à droite (menu : Compte, Documents, Messages, Déconnexion) | Accueil · Mon logement · Messages · Documents · Compte (`Nav-Mobile`) |
| Candidat | ni bien ni logement | Barre du haut : Accueil · Explorer · Messages ; avatar + nom | Accueil · Explorer · Messages · Compte |
| Visiteur | non connecté | Barre du haut publique (landing / Explorer) | Explorer · Se connecter |

« Favoris » (planches `Nav-Candidat` et `Nav-Mobile`) n'existe pas dans l'API : l'entrée n'est pas construite (voir les évolutions).

## Correspondance des jetons

Nouveaux noms et valeurs : `../frontend-audit/livraison-dev.md`, section « Table des jetons ». Pour le **sombre**, les valeurs se dérivent de `@mixin sombre` en gardant les mêmes rôles. La couleur d'action sombre doit garder un contraste AA (au moins 4,5:1 pour le texte sur l'olive et l'olive sur le fond).

| Jeton actuel (usages) | Nouveau jeton | Remarque |
| --- | --- | --- |
| `--kp-bg` (11) | `--kp-bg` `#F4F5F1` | |
| `--kp-surface` (23) | `--kp-surface` `#FFFFFF` | |
| `--kp-surface-2` (28) | `--kp-surface-sunken` `#EDEFE8` | |
| `--kp-surface-3` (4) | `--kp-segment-bg` `#E6EAE0` | |
| `--kp-border` (28) | `--kp-border` `rgba(16,33,43,0.08)` | Contour des cartes |
| `--kp-border-strong` (18) | `--kp-border-strong` `rgba(16,33,43,0.14)` | **Ajout** : champs et boutons secondaires (la doc donne 0,12 à 0,16) |
| `--kp-text-1` (30) | `--kp-text` `#10212B` | |
| `--kp-text-2` (21) | `--kp-text-muted` `#46545C` | |
| `--kp-text-3` (38) | `--kp-text-subtle` `#66737A` | |
| `--kp-text-invert` | `--kp-text-on-accent` `#FFFFFF` | **Ajout** : texte sur olive et sur nuit plein |
| `--kp-primary` (18) | `--kp-accent` `#4F6A2E` | L'olive devient foncée |
| `--kp-primary-hover` (1) | `--kp-accent-hover` | **Ajout**, olive un cran plus foncé (par exemple `#435A27`) |
| `--kp-primary-on` (7) | `--kp-text-on-accent` `#FFFFFF` | Le texte sur l'olive passe de nuit à blanc |
| `--kp-primary-text` (13) | `--kp-accent` | |
| `--kp-primary-subtle` (7) | `--kp-accent-soft` `#EDF3E0` | |
| `--kp-success` / `-subtle` (3 / 2) | `--kp-state-success` `#2F8A4E` / `--kp-state-success-bg` `#E5F1E8` / `--kp-state-success-text` `#22663A` | Point / fond de badge / texte de badge |
| `--kp-warning` / `-subtle` (4 / 3) | `--kp-state-warning` `#B7791F` / `-bg` `#FBEFDD` / `-text` `#8A5A12` | |
| `--kp-danger` / `-subtle` (9 / 3) | `--kp-state-danger` `#B42318` / `-bg` `#FBE9E7` / `-text` `#8E1B12` | |
| `--kp-info` / `-subtle` (3 / 2) | `--kp-state-neutral` `#66737A` / `-bg` `#EDEFE8` / `-text` `#46545C` | Pas d'équivalent « info » dans la nouvelle table |
| `--kp-nav-bg`, `--kp-nav-text`, `--kp-nav-active`, `--kp-nav-accent` (4 / 3 / 5 / 2) | supprimés | La barre latérale devient `--kp-surface` ; élément actif `--kp-text` plein + `--kp-text-on-accent` |
| `--kp-font` (3) | `--kp-font` : `'Figtree', system-ui, …` | Graisses 400 / 500 / 600 seulement |
| `--kp-font-display` (10) | supprimé | Titres en Figtree 500 ; le nom « kupanga » est le SVG du logo |
| `--kp-fs-xs` 12 / `-sm` 14 / `-md` 16 / `-lg` 20 / `-xl` 24 / `-2xl` 32 | `--kp-fs-mention` 12 / `--kp-fs-secondary` 13 / `--kp-fs-body` 15 (interligne 22) / `--kp-fs-card-title` 17 / `--kp-fs-subtitle` 20 / `--kp-fs-page-title` clamp(24px, …, 32px) / `--kp-fs-landing` clamp(40px, …, 56px) | Alias : xs→mention, sm→secondary, md→body, lg→subtitle, xl et 2xl→page-title |
| `--kp-space-1…8` | conservés (4 · 8 · 12 · 16 · 24 · 32) + `--kp-space-12` 48 | |
| `--kp-space-5` 20, `--kp-space-10` 40 | conservés temporairement | Hors de la grille de la doc, retirés écran par écran |
| `--kp-radius-sm` 8 | `--kp-radius-sm` 8 | |
| `--kp-radius` 12 (28) | `--kp-radius-md` 12 | |
| `--kp-radius-lg` 20 | `--kp-radius-lg` 20 | |
| `--kp-radius-full` (13) | `--kp-radius-pill` 999 | |
| `--kp-shadow` (6) | `--kp-elev-1` (barres, menus, toasts) ou `--kp-elev-2` (fenêtres) ; `--kp-elev-0` pour les cartes | |
| `--kp-focus` | conservé, recoloré avec l'olive foncée | Focus clavier toujours visible |
| `--kp-backdrop` | conservé `rgba(16,33,43,0.45)` | Voile des fenêtres |
| `--kp-duree` 220ms | `--kp-duree` 160ms, `--kp-duree-lente` 480ms, `--kp-ease` `cubic-bezier(0.22,1,0.36,1)` | À 0 si `prefers-reduced-motion` |
| `--kp-tap`, `--kp-safe-*`, `--kp-tabbar-h`, `--kp-bottom-offset` | conservés | Mécanique de mise en page, inchangée |
| — | `--kp-page-pad` `clamp(12px,1.6vw,24px)`, `--kp-card-pad` `clamp(16px,1.4vw,20px)`, `--kp-sidebar-w` `clamp(208px,15vw,240px)` | **Ajouts** |

Les couleurs écrites en dur hors de `_theme.scss` (environ 60 occurrences : `landing.component.scss`, `app.scss`, `toasts.component.ts`, `nouvel-edl.component.scss`, `galerie.component.ts`, `signature.component.ts`, `carte-bien.component.ts`, `carte-annonces.component.ts`, `carte-repere.component.ts`…) sont remplacées par des jetons dans la phase qui touche leur écran.

## Évolutions serveur identifiées (non construites)

| # | Évolution | Où dans les maquettes | Ce que fait le front en attendant |
| --- | --- | --- | --- |
| E1 | Photos de l'état des lieux (stockage serveur, champ par pièce) | `Assist-EDL`, `Assist-EDL-Mobile` | Bloc omis |
| E2 | Texte complet du bail dans l'API | `Signer-Bail`, `Assist-Bail` (aperçu) | Aperçu construit avec les champs du contrat ; texte complet dans le PDF |
| E3 | Image de la signature du bailleur | `Signer-Bail` (cadre « Le bailleur ») | « Signé par … le … » |
| E4 | Favoris | `Nav-Candidat` (entrée), `Nav-Mobile` (onglet et tuile « Favoris ») | Entrée, onglet et tuile omis |
| E5 | Alertes de recherche | `Nav-Candidat` (« Annonces, carte et alertes ») | Texte sans « alertes » |

Toute nouvelle évolution découverte pendant une phase s'ajoute à cette table, dans le commit de documentation de la phase, et figure dans le rapport de fin de phase.

## Ordre des phases

L'ordre suit celui des lots de la doc de livraison. Le code ne justifie aucun autre ordre : la navigation (phase 2) dépend des composants transverses (phase 1), et tous les écrans dépendent de la navigation.

| Phase | Prompt | Contenu |
| --- | --- | --- |
| 1 | `prompt-01-fondations.md` | Branche, jetons et alias, Figtree, logo et icônes, composants transverses |
| 2 | `prompt-02-navigation.md` | Barre latérale propriétaire, barre du haut locataire / candidat, téléphone, messagerie à défilements séparés, redirection locataire |
| 3 | `prompt-03-parcours-proprietaire.md` | Accueil propriétaire, fiche du bien à onglets, bail et assistant, états des lieux et assistant, quittances |
| 4 | `prompt-04-parcours-locataire-signature.md` | Mon logement, quittances locataire, logement réservé, accueil candidat, signature par lien |
| 5 | `prompt-05-vitrine.md` | Landing, Explorer, annonce France / RDC / propriétaire, écrans sans maquette, retrait des alias |
| 6 | `prompt-06-tests-e2e.md` | Playwright, parcours e2e, non-régression des appels API, conformité visuelle |

Chaque phase se termine par un rapport, puis **s'arrête** : la suivante est lancée par Gédéon.

## Suivi

| Phase | État | Commit de fin | Écarts restants |
| --- | --- | --- | --- |
| 1 | à faire | | |
| 2 | à faire | | |
| 3 | à faire | | |
| 4 | à faire | | |
| 5 | à faire | | |
| 6 | à faire | | |

Chaque session met à jour sa ligne dans le dernier commit de sa phase (`docs(refonte): bilan de la phase N`).
