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
| `--kp-text-3` (38) | `--kp-text-subtle` `#636F76` | Valeur de la doc `#66737A` foncée d'un cran : 4,72:1 sur `--kp-bg` (décision du 7 nov. 2026) |
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
| `--kp-focus` | conservé : anneau nuit (menthe en sombre) avec liseré de surface, comme la planche `DS-Fondations` | Focus clavier toujours visible (décision du 7 nov. 2026) |
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
| E6 | Recherche des conversations par personne | `Nav-Proprio-Messages` (« Personne ou bien ») | L'API ne filtre que par `nomDuBien` : champ « Rechercher un bien » |
| E7 | Plafonds légaux du dépôt de garantie par juridiction (meublé, vide) | `Assist-Bail` (avertissement « plafonné à deux mois ») | Avertissement non bloquant quand le dépôt diffère de celui de l'annonce |
| E8 | Bien réservé retiré de la recherche publique | `Fiche-Bien-Vacant` (« réservé 14 jours et retiré des annonces ») | Phrase omise ; un bien réservé n'est pas compté dans « Annonces en ligne » |

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
| 1 | faite (6 nov. 2026) : build vert, 119/119 tests | voir `git log` (« docs(refonte): bilan de la phase 1 ») | Voir « Bilan de la phase 1 » ci-dessous |
| 2 | faite (7 nov. 2026) : build vert, 132/132 tests | voir `git log` (« docs(refonte): bilan de la phase 2 ») | Voir « Bilan de la phase 2 » ci-dessous |
| 3 | faite (7 nov. 2026) : build vert, 154/154 tests | voir `git log` (« docs(refonte): bilan de la phase 3 ») | Voir « Bilan de la phase 3 » ci-dessous |
| 4 | à faire | | |
| 5 | à faire | | |
| 6 | à faire | | |

Chaque session met à jour sa ligne dans le dernier commit de sa phase (`docs(refonte): bilan de la phase N`).

### Bilan de la phase 1

**Ce qui est en place pour les phases suivantes**

| Élément | Où | Usage |
| --- | --- | --- |
| Jetons par rôle + alias | `src/styles/_theme.scss` | Bloc `// ALIAS À RETIRER (phase 5)` ; les alias sont déclarés une fois sur `:root` et suivent le thème |
| Interligne du corps | `--kp-lh-body` | 22 px pour 15 px, écrit en ratio (1,4667) pour ne pas écraser les textes plus grands qui en héritent |
| `kp-logo` | `shared/ui/logo.component.ts` | `[hauteur]`, `forme="icone"` ; branché sur les pages de connexion, de signature et légales |
| `kp-onglets` | `shared/ui/segmented.component.ts` | Onglets de page en liens : `[onglets]="[{ libelle, lien, nombre?, exact? }]"` |
| `kp-segmented` classe `plein` | idem | Occupe toute la largeur |
| `kp-statut forme="point"` / `.kp-statut--point` | `shared/ui/statut.component.ts` | Point + texte dans le texte courant |
| `kp-frise` | `shared/ui/frise.component.ts` | `[etapes]="[{ libelle, detail?, etat, icone? }]"`, `titre` ; aucun calcul d'étape |
| `kp-sheet forme="panneau"` | `shared/ui/sheet.component.ts` | Panneau latéral droit sur tablette et ordinateur |
| `.kp-table` | `_components.scss` | `.kp-table-cadre`, `__titre`, `__nombre`, `__discret`, `__secondaire`, `__actions`, `__tri`, `.kp-table-pied`, `data-libelle` sur téléphone |
| Bannières structurées | `_components.scss` | `.kp-bandeau__corps`, `__titre`, `__texte`, `__action` |
| Divers | `_components.scss` | `.kp-tabulaire`, `.kp-input-groupe--long` (« € par mois »), `.kp-icon-btn--sm`, `.kp-skeleton--vignette`, `.kp-card__titre` |

**Écarts restants avec `DS-Fondations` et `DS-Composants`**

| Composant | Écart | Raison | Suite |
| --- | --- | --- | --- |
| Navigation | Ancienne barre latérale et barre d'onglets, passées en clair par les alias `--kp-nav-*` ; carré « K » + nom en texte | Refaite en phase 2 | Phase 2 |
| Focus clavier | Anneau nuit (menthe en sombre) avec liseré de surface, comme la planche, et non olive comme l'annonçait la table des jetons | La planche montre un anneau nuit ; l'olive sur un bouton olive se distinguait mal | **Validé** (7 nov.) |
| États vides | Icône Lucide au trait 1,5 sur un aplat olive clair, pas les illustrations dessinées de la planche | Pas de jeu d'illustrations dans le code | **Validé** en attendant des illustrations fournies (7 nov.) |
| Lignes de liste | Titre coupé par une ellipse, mais l'attribut `title` (texte complet au survol) n'est pas encore posé dans les gabarits | Ajouté écran par écran | Phases 3 à 5 |
| Frise, onglets de page, tableaux | Prêts mais pas encore utilisés par un écran | Les écrans viennent avec leur phase | Phases 3 et 4 |
| Toasts en thème sombre | Toast « inversé » menthe plein avec texte nuit | Les maquettes ne couvrent pas le sombre | **Validé** tant que les maquettes ne couvrent pas le sombre (7 nov.) |
| `--kp-text-subtle` sur `--kp-bg` | 4,46:1 (juste sous 4,5:1) | Valeur imposée par la table des jetons ; 4,89:1 sur `--kp-surface` | **Corrigé** en phase 2 : `#636F76` (4,72:1), commit « fix(ds): contraste de --kp-text-subtle » |
| Bouton WhatsApp | Vert de marque en dur (`#1f7a3f`) | Couleur de marque, hors jetons | Aucune |
| Bandeau « Installer l'application » | Couvre le haut de la page de connexion à l'ouverture, logo compris | Comportement existant (`app.html`), seules ses couleurs ont changé | **Corrigé** en phase 2 : le bandeau passe en bas, au-dessus des onglets |

Aucune nouvelle évolution serveur découverte en phase 1.

**Décisions sur ce bilan (7 novembre 2026)** : focus clavier en anneau nuit (menthe en sombre), la table des jetons est corrigée ; `--kp-text-subtle` passe à `#636F76` ; toasts inversés en sombre validés tant que les maquettes ne couvrent pas le sombre ; `kp-logo` sur les pages légales et toasts à 5 s validés ; états vides en icône Lucide sur aplat olive clair en attendant des illustrations fournies.

### Bilan de la phase 2

**Ce qui est en place**

| Élément | Où | Usage |
| --- | --- | --- |
| Profil de navigation | `core/navigation/navigation.service.ts` | `profil()` : `visiteur`, `candidat`, `locataire`, `proprietaire` (un bien possédé suffit) ; `onglets()` (ordinateur) et `ongletsMobile()` par profil ; `profilConnu()` est faux juste après une connexion, tant que l'API n'a pas répondu (aucune barre plutôt qu'une bascule candidat → propriétaire) |
| Barre latérale | `layouts/app-shell/barre-laterale.component.ts` | Propriétaire, dès 768 px ; `view-transition-name` pour ne pas clignoter entre deux écrans |
| Barre du haut | `layouts/app-shell/barre-haut.component.ts` | Locataire, candidat ; menu du compte (Compte, Documents si `aDesDocuments`, Messages, Déconnexion par `AuthService.logout()`) ; visiteur : barre publique fonctionnelle (style en phase 5) |
| Téléphone | `layouts/app-shell/entete-mobile.component.ts`, onglets dans `app-shell` | En-tête fixe et onglets du bas ; `data-onglets` / `--kp-bottom-offset` conservés |
| `--kp-top-offset` | `styles/_theme.scss` | Hauteur de la barre du haut (68 px, ordinateur) ou de l'en-tête (60 px, téléphone), posée par `data-barre` / `data-onglets` ; lue par `kp-page-header` (barre collée dessous) et la carte d'Explorer |
| Cloche | `shared/ui/cloche.component.ts` | `variante` : `carte` (32 px), `barre`, `entete` (44 px) ; elle n'est plus dans `kp-page-header` |
| Arrivée | `core/auth/guards/auth.guard.ts` | `accueilPour(user, { aDesBiens, aUnLogement })` : locataire sans bien → `/mon-logement` ; `accueilGuard` lui passe les valeurs relues par `charger()` |
| Messagerie | `features/messagerie/**` | Plein écran sur téléphone seulement (`BreakpointObserver`) ; carte à la hauteur de la fenêtre et deux défilements ailleurs ; « Proposer la location » pour le propriétaire d'un bien sans locataire ni archive |

**Écarts restants avec les maquettes**

| Maquette | Écart | Raison | Suite |
| --- | --- | --- | --- |
| `Nav-Proprio-Tableau` | Pas de compteur de biens à côté de « Mes biens » | Aucun nombre de biens n'est gardé : `LogementContextService` ne retient qu'un booléen, `DonneesProprietaireService` n'est chargé que par l'accueil et les documents | À décider : garder le nombre dans `LogementContextService.charger()` (même appel `GET /users/biens`) |
| `Nav-Proprio-*`, barres | Cloche avec la pastille rouge du nombre de non lues, et non un point olive | Le test de `kp-cloche` et l'accessibilité demandent le nombre | Aucune |
| `Nav-Proprio-Messages` | Recherche « Rechercher un bien » au lieu de « Personne ou bien » | L'API ne cherche que par bien (E6) | Évolution E6 |
| `Nav-Proprio-Messages` | Heure et accusé (coches) dans la bulle, pas en dessous avec « · lu » | Structure du fil existante gardée (états d'envoi, échec, réessai) | Phase 6 si besoin |
| `Nav-Proprio-Messages` | « Non lues · N » compte les messages non lus (compteur global), comme la pastille de la barre | Seule donnée chargée sans nouvel appel | Aucune |
| `Nav-Candidat`, `Nav-Mobile` | Pas de « Favoris » (entrée, onglet, tuile) | E4 | Évolution E4 |
| `Nav-Mobile`, `Mon-Logement`, `Nav-Candidat` | Contenu des écrans (titres, tuiles, frise) | Phases 3 et 4 | Phases 3 et 4 |
| Barre publique (visiteur) | Style provisoire ; le logo mène à la landing, hors barre | Phase 5 | Phase 5 |
| Téléphone | Le titre replié de `kp-page-header` n'apparaît plus quand l'en-tête d'écran n'a ni retour ni action (sa barre vide est masquée sous l'en-tête de l'application) | Éviter une bande vide de 56 px | Phases 3 à 5, écran par écran |

**Autres points**

- Tablette (768 à 1099 px) : barre latérale complète au lieu de l'ancien rail d'icônes de 88 px.
- Le budget de taille du paquet initial (avertissement à 500 ko) est dépassé de 4 ko : la mise en page est chargée d'emblée. Avertissement seulement, le build reste vert.
- L'écran « Demandes de location » (`/demandes-location`) n'est toujours dans aucun menu ; il est repris sur l'accueil candidat en phase 4 (décision à prendre si une entrée est souhaitée avant).
- Évolution découverte : E6 (recherche des conversations par personne).

**Décisions sur ce bilan (7 novembre 2026)** :
- Compteur de biens : `LogementContextService` garde le nombre de biens possédés tiré de la réponse déjà reçue de `GET /users/biens` (aucun nouvel appel), affiché à côté de « Mes biens » dans la barre latérale. **Fait** en phase 3 (« feat(nav): compteur de biens dans la barre latérale », avec test).
- « Demandes de location » : pas d'entrée de menu ; l'écran est repris sur l'accueil candidat en phase 4.
- Paquet initial à 504 ko : accepté, seuil de 500 ko inchangé ; à réexaminer en fin de phase 5.
- Écarts de la phase 2 (cloche avec compteur, recherche par bien E6, non-lues en messages, en-tête téléphone masqué quand vide) : validés.

### Bilan de la phase 3

**Ce qui est en place**

| Élément | Où | Usage |
| --- | --- | --- |
| Étapes de la location | `features/proprietaire/etapes-location.ts` (+ spec) | `calculerEtapesLocation({ bien, contrats, edls, quittances })` : Annonce → Réservation → Bail → État des lieux → Quittances, `courante`, `prochaine` (titre, texte, action, lien) ; `bailLePlusRecent()` (tri date de début puis id) ; `precisionEtat()` (« bail à créer ») |
| Chiffres de l'accueil | `features/proprietaire/accueil/chiffres-accueil.ts` (+ spec) | Biens loués, occupation, loyer attendu **par devise**, quittances du mois, annonces en ligne (sans les biens réservés) |
| En-tête de la fiche | `features/proprietaire/fiche/fiche-entete.component.ts` | Fil, titre, état, loyer, adresse, actions, menu « … » ; onglets en liens (loué, réservé) ou onglet local Vue d'ensemble · Annonce (vacant, `racine`) |
| `kp-assistant` | `shared/ui/assistant.component.ts` (+ spec) | `manque`, `modifie` (confirmation avant « Quitter »), `sousTitre`, `libelles`, `resumes`, `note`, `disposition` (`laterale` / `haut`), `apercu` + `<… apercu>`, `<… actions>` |
| Jetons photo | `styles/_theme.scss` | `--kp-photo-voile`, `--kp-photo-texte` : pastilles posées sur une photo, mêmes valeurs dans les deux thèmes |
| Libellé court d'état | `models/edl-libelles.ts` | `ETATS[].court` (« H.S. ») : affichage téléphone seulement |
| Compteur de biens | `LogementContextService.nombreBiens` | Barre latérale |

**Vérifications** : build de production vert à chaque commit ; **154 tests sur 154** avec Edge ; paquet initial **508 ko** (504 ko après la phase 2 : icône `Megaphone`, `kp-sheet` dans l'assistant, compteur de biens). Parcours vérifiés par captures Edge (1440 px et 390 × 844, clair et sombre) avec Claire (France) et Patrick (RDC) : accueil, fiche louée et ses quatre onglets, fiche vacante et onglet Annonce, assistants bail, état des lieux, nouveau bien et nouvelle quittance jusqu'à la vérification (rien validé), « Quitter » avec et sans saisie, message « ce qui manque ».

**Données de test (créées le 7 novembre 2026, avec l'accord de Gédéon)**, par les mêmes appels que le front :
- Claire, bien 1 (Lucas) : bail n° 1 signé par les deux parties, état des lieux d'entrée n° 1 signé, quittances de septembre (en attente), octobre (déclarée reçue, virement) et novembre (créée par l'API à la signature du bail, échéance le 5 décembre) ;
- Patrick, bien 141 (Grâce) : bail n° 2 (garantie 2 mois, 3 mois d'avance, USD), quittance de novembre en attente. Pour la phase 4, Patrick a signé le bail n° 2 et l'état des lieux d'entrée n° 2 (Cash Power) : **les deux attendent Grâce**, leurs liens sont valides (détail dans `prompt-04-parcours-locataire-signature.md`).
Page du bail (à signer et signé), états des lieux et quittances revérifiés sur ces données. Constat : l'API renvoie le mois d'une quittance **en texte** (« 10 ») ; les calculs du front le convertissent (« fix(proprietaire): mois des quittances lu en nombre »).

**Appels réseau** : accueil et fiche font les mêmes requêtes qu'avant (mêmes services, aucun appel retiré). Seul ajout : `POST /conversations/search` (déjà appelé par la messagerie) sur la fiche d'un bien **vacant**, une fois, filtré par titre puis par `bienId`, pour « la dernière personne qui a écrit ».

**Écarts restants avec les maquettes**

| Maquette | Écart | Raison | Suite |
| --- | --- | --- | --- |
| `Nav-Proprio-Tableau` | « Ajouter un bien » en olive, pas en nuit | Le bouton principal du DS est olive | À valider |
| `Nav-Proprio-Tableau` | « 1 conversation en cours » (annonces en ligne) et « 1 personne vous a écrit » (ligne de bien) absents | L'accueil ne charge pas les conversations ; les ajouter ferait un nouvel appel | À décider |
| `Nav-Proprio-Tableau` | « À faire aussi » ne montre pas « Répondre à Inès » ni « Créer la quittance de novembre » | Ces tâches n'existent pas dans `calculerTaches()` (règles inchangées) ; la tâche qui répète la prochaine étape de la carte n'est pas répétée | À décider (nouvelles règles de tâches) |
| `Nav-Proprio-Tableau` | Échéance et « Pas encore déclaré reçu » absents s'il n'y a pas de quittance du mois (cas des données de démo) | Rien à calculer sans quittance | Aucune |
| `Nav-Proprio-Tableau` | Frise de la carte : composant `kp-frise` (pastilles 36 px, texte aligné à gauche) et non la variante centrée à 46 px | Un seul composant de frise | Aucune |
| `Fiche-Bien-Loue`, `Fiche-Bien-Vacant` | Frise à 4 étapes visibles sur les 5 calculées (Annonce → État des lieux avant le choix du locataire, Réservation → Quittances ensuite) ; libellés « Réservation » et « Annonce » au lieu de « Réservé », « Annonce en ligne », « Locataire » | Même calcul que l'accueil | Aucune |
| `Fiche-Bien-Vacant` | Pas de « le logement lui est réservé 14 jours et **retiré des annonces** » | L'API laisse un bien réservé dans la recherche publique (seuls `locataire` et `archive` filtrent) : la phrase serait fausse | Évolution E8 |
| `Fiche-Bien-*` | Précision d'état (« Loué · bail à créer ») sur la vue d'ensemble seulement | Les autres onglets ne chargent pas les états des lieux et quittances | Aucune |
| `Fiche-Bien-*` | Carte en lecture seule `kp-carte-bien` (Leaflet) et non `carte-repere` (éditeur de position) | `carte-repere` sert à placer le repère dans « Modifier » | Aucune |
| `Fiche-Bien-Loue` | « Mettre fin au bail » garde le style de `fin-de-bail.component.ts` (bouton contour, pas de lien rouge) | Composant testé, laissé tel quel | Phase 6 si besoin |
| Onglet Annonce (vacant) | Pas de maquette : publication, texte, conditions affichées, liens | Contenu limité à `BienDTO` | À valider |
| `Bail-A-Signer` | Titre de page = titre du bien (en-tête commun aux quatre onglets), pas « Bail de Lucas Bernard » | Consigne : même en-tête sur les quatre pages | Aucune |
| `Assist-Bail` | Pas de « Brouillon enregistré à 14:32 » ni « Enregistrer et quitter » | Aucun brouillon côté serveur ni côté front | Évolution si souhaitée |
| `Assist-Bail` | Avertissement sur le dépôt : « diffère de celui de l'annonce », pas le plafond légal (2 mois en meublé, 1 mois vide) | Aucun plafond n'est connu du code ni de `GET /juridictions/{pays}` | Évolution E7 |
| `Assist-Bail` | Pas de « Résidence principale » dans l'aperçu ; lignes grises remplacées par « Le texte complet figure dans le PDF » | Pas dans les données (E2) | E2 |
| `Assist-EDL` | Pas de « 1 sur 4 vérifiée », icônes de pièce, menu « … » de la pièce : numéro de pièce, nombre d'éléments « à noter », corbeille | « Vérifiée » n'existe pas dans les données ; jeu d'icônes limité | Aucune |
| `Assist-EDL`, `Assist-EDL-Mobile` | Bloc photos absent | E1 | E1 |
| `Assist-EDL-Mobile` | Le bouton retour système quitte l'assistant (sans confirmation, sans revenir à la liste des pièces) | Il faudrait un `CanDeactivate` (garde de route) ou une entrée d'historique : hors périmètre « mêmes guards » | À décider |
| `DS-Composants` (tableau) | Colonne « Locataire » remplacée par Échéance et Paiement ; actions secondaires dans un menu « … » par ligne | Tableau d'un seul bien, un seul locataire ; toutes les actions existantes gardées | Aucune |

**Évolutions découvertes** : E7 (plafonds légaux du dépôt de garantie par juridiction), E8 (retirer un bien réservé de la recherche publique, comme l'annonce la maquette).

