# Prompt · Phase 1 · Fondations

> À donner tel quel à une nouvelle session de Claude Code ouverte dans `kupanga/kupanga-front`.

---

Tu réalises la **phase 1 sur 6** de la refonte UX/UI du front Kupanga (Angular 20, composants autonomes, signaux). Elle pose les fondations : jetons de design `--kp-*`, police Figtree, logo et icônes, composants transverses. À la fin de la phase, toute l'application a la nouvelle apparence de base, sans qu'aucun écran ne soit encore réorganisé.

## Règles (non négociables)

- **Ne touche pas au back.** Aucun fichier de `../kupanga-Api/`.
- **Logique métier intacte.** Mêmes routes (`src/app/app.routes.ts`), mêmes appels API, mêmes données, mêmes règles de validation, mêmes guards. Services, modèles et fonctions de calcul restent tels quels. Tu changes l'apparence, l'organisation des écrans et les composants d'interface, rien d'autre.
- **Rien d'inventé.** Une donnée ou un comportement absent de l'API est noté comme « Évolution » et signalé, jamais simulé.
- **Pas d'installation.** Aucun paquet npm ajouté. Chrome n'est pas installé : utilise Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
- **Pas de nouvelle route**, même temporaire, même pour une page de démonstration des composants.
- **Ne crée ni ne modifie aucune donnée métier** sans le demander.
- Pas de `git push`.

## Branche

1. Vérifie que l'arbre de travail est propre, à l'exception de `docs/refonte-front/`, qui n'est pas encore suivi et doit le rester jusqu'au premier commit.
2. `git checkout feature/pret-pour-la-prod`
3. `git checkout -b refonte-front`

Toute la phase se fait sur `refonte-front`.

## À lire avant de commencer

1. `docs/refonte-front/00-vue-ensemble.md` : règles, décisions, **table de correspondance des jetons**, évolutions. C'est ta référence pour les noms de jetons.
2. `../frontend-audit/livraison-dev.md` : sections « Mode d'emploi », « Table des jetons », « Composants transverses ».
3. Maquettes : `../frontend-audit/maquettes/png/DS-Fondations.png`, `DS-Composants.png`, `Identite-Logo-Final.png`, `Identite-Icones-Regles.png`, puis les fichiers HTML de même nom dans `../frontend-audit/maquettes/html/` pour relever les valeurs exactes.
4. Logo et icônes : `../frontend-audit/identite/kupanga-logo/`, en particulier `head-extrait.html` et `manifest-extrait.json`.
5. Le code existant : `src/styles/_theme.scss`, `_base.scss`, `_components.scss` (843 lignes, toutes les classes `kp-*` partagées), `_mq.scss`, `src/index.html`, `public/manifest.webmanifest`, `ngsw-config.json`, `src/app/shared/ui/*`, `src/app/shared/components/icon/icon.component.ts`, `src/app/core/ui/toast.service.ts`, `src/app/core/services/theme.service.ts`.

## Travail à réaliser

### 1. Jetons (`src/styles/_theme.scss`)

- Déclare les nouveaux jetons par rôle (couleurs, états point / fond / texte, typographie, rayons, élévations, espacements, marges de page et de carte, mouvement), avec les valeurs de `livraison-dev.md` et les ajouts listés dans `00-vue-ensemble.md` (`--kp-border-strong`, `--kp-text-on-accent`, `--kp-accent-hover`, `--kp-space-12`, `--kp-page-pad`, `--kp-card-pad`, `--kp-sidebar-w`, `--kp-ease`, `--kp-duree-lente`).
- **Alias** : chaque ancien nom (`--kp-text-1`, `--kp-primary`, `--kp-surface-2`, `--kp-radius`, `--kp-fs-md`…) pointe vers le nouveau jeton (`--kp-text-1: var(--kp-text)`). Ainsi les 57 jetons utilisés dans `src/` basculent sans toucher les composants. Marque le bloc d'alias d'un commentaire `// ALIAS À RETIRER (phase 5)`.
- `--kp-nav-*` : alias provisoires vers les nouvelles valeurs (barre claire). La phase 2 les supprime en refaisant la navigation.
- `--kp-font-display` : alias provisoire vers `--kp-font` (Figtree), pour que la landing et les pages légales restent lisibles jusqu'à la phase 5.
- **Thème sombre** (décision : conservé) : réécris `@mixin sombre` avec les **nouveaux noms**, en dérivant les valeurs de la palette sombre actuelle (fond `#0b181f`, surface `#10212b`, textes en menthe `#effbdb` à différentes opacités…). L'olive d'action doit garder au moins 4,5:1 de contraste : en sombre, une olive claire avec texte nuit est acceptable. Le mécanisme ne change pas : `prefers-color-scheme`, `data-theme`, script de `index.html`, `theme.service.ts`.
- `prefers-reduced-motion` : `--kp-duree` et `--kp-duree-lente` à 0.

### 2. Police Figtree

- `src/index.html` : remplace le lien Google Fonts (DM Sans + DM Serif Display) par `family=Figtree:wght@400;500;600&display=swap`. Garde les `preconnect`.
- `--kp-font` : `'Figtree', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.
- Les graisses 700 du code passent à 600 : cherche `font-weight: 700`, `bold` et `<strong>` stylés.
- `ngsw-config.json` : le groupe `polices` couvre déjà `fonts.googleapis.com` et `fonts.gstatic.com`, rien à changer. Vérifie-le quand même.
- Chiffres tabulaires (`font-variant-numeric: tabular-nums`) sur les montants : la classe `.kp-montant` existe déjà dans `_components.scss`. Complète-la, et les écrans des phases suivantes l'appliqueront aux montants qu'ils affichent.
- `manifest-extrait.json` réduit `name` à « Kupanga » et passe `background_color` à `#F4F5F1`. Applique ces valeurs, et garde `description`, `lang`, `display` et les autres champs actuels.

### 3. Logo, favicon, icônes d'application

- Copie depuis `../frontend-audit/identite/kupanga-logo/` :
  - `favicon.ico`, `favicon.svg` → `public/` (remplacent les actuels) ;
  - `apple-touch-icon.png` → `public/icons/apple-touch-icon.png`, chemin déjà référencé par `index.html` ;
  - `icone-app-192.png`, `icone-app-512.png`, `icone-app-maskable-192.png`, `icone-app-maskable-512.png` → `public/icons/` ;
  - `kupanga-logo-clair.svg`, `kupanga-logo-sombre.svg`, `kupanga-icone-clair.svg`, `kupanga-icone-sombre.svg` → `public/brand/`.
- `public/manifest.webmanifest` : applique `manifest-extrait.json` (icônes `any` et `maskable`, couleurs) en **gardant les chemins relatifs** (`scope: "./"`, `start_url: "./"`, `icons/...`). Les extraits utilisent des chemins absolus (`/favicon.ico`) ; l'application, elle, est servie avec `<base href="/">` et des chemins relatifs, et cela doit rester ainsi. Retire de la liste les anciennes icônes `icon-72x72` … `icon-384x384` si l'extrait ne les garde pas, sans supprimer les fichiers tant qu'un autre endroit les référence (vérifie avec Grep).
- `index.html` : `theme-color` et `<link rel="icon">` selon `head-extrait.html`, chemins relatifs.
- Crée un composant **`kp-logo`** (`src/app/shared/ui/logo.component.ts`) : `<img>` du SVG clair ou sombre selon le thème effectif (`ThemeService`), hauteur réglable (26 à 28 px dans les barres), `role="img"` et `aria-label="Kupanga"`. Il n'est **pas encore branché** dans les barres (phase 2), mais il remplace dès maintenant le logo texte (`span.logo__k` + DM Serif) de `src/app/core/auth/ui/auth-layout.component.ts`, utilisé par les pages de connexion et de signature.
- `src/assets/logos/*.svg` : vérifie avec Grep où ces fichiers sont utilisés avant toute modification. Ne supprime rien qui reste référencé.

### 4. Composants transverses

Garde les **noms de classes et les API des composants existants** (`kp-btn`, `kp-btn--primary`, `kp-field`, `kp-label`, `kp-bandeau`, `kp-skeleton`, `kp-pastille`, `kp-list__item`, les entrées et sorties de `kp-segmented`, `kp-sheet`, `kp-vide`, `kp-statut`…). Des dizaines de gabarits en dépendent : tu changes leur rendu, pas leur interface. Tu peux ajouter des variantes.

| Composant | Où dans le code | Spécification (`livraison-dev.md` + `DS-Composants`) |
| --- | --- | --- |
| Boutons | `_components.scss` (`.kp-btn*`), `.kp-icon-btn` | 4 niveaux : principal olive plein, secondaire contour (`--kp-border-strong`), discret, danger. Pilule, 44 px (40 px avec `--sm` et dans les barres). Focus visible, état désactivé, `kp-spinner` dans le bouton pendant un envoi |
| Champs | `.kp-field`, `.kp-label`, `.kp-input`, `.kp-aide`, `.kp-erreur` (vérifie les noms réels) | Rayon 12 px, libellé au-dessus, unité à droite (« € par mois »), aide dessous, erreur en rouge **avec texte** |
| Contrôle segmenté et onglets de page | `src/app/shared/ui/segmented.component.ts` | Fond `--kp-segment-bg`, élément actif nuit plein (`--kp-text` + `--kp-text-on-accent`). Défilement horizontal au-delà de 5 options ou sur téléphone, l'option active reste visible (`scrollIntoView`). Ajoute, si besoin, une variante « liens » (`routerLink`) pour les onglets de page des phases 3 et 4, sans casser l'usage actuel |
| Badges d'état | `src/app/shared/ui/statut.component.ts` | Point + texte dans le texte courant, badge (fond / texte) dans les tableaux ; jamais la couleur seule. Les tons actuels (`ok`, `danger`, `neutre`…, voir `demande-location.model.ts`) se mappent sur success / warning / danger / neutral |
| Toasts | `src/app/shared/ui/toasts.component.ts`, `core/ui/toast.service.ts` | Bas droite sur ordinateur, bas centre sur téléphone (au-dessus de `--kp-bottom-offset`), 5 s, 3 empilés au plus, action « Annuler » possible. **Ne change pas l'API de `ToastService`** ; si « Annuler » demande un paramètre, ajoute-le en option |
| Bannières | `.kp-bandeau`, `.kp-bandeau--danger`… | En haut du bloc concerné ; une erreur ne disparaît jamais seule |
| Fenêtres et panneaux | `src/app/shared/ui/sheet.component.ts` | Fenêtre centrée (confirmation), panneau latéral droit (ordinateur), panneau qui monte (téléphone). Fond figé, fermeture par ✕, Échap ou voile, focus piégé (`@angular/cdk/a11y` est déjà installé), `--kp-elev-2` |
| États vides | `src/app/shared/ui/vide.component.ts` | Illustration au trait 1,5 + aplat `--kp-accent-soft`, une phrase, une première action |
| Squelettes | `.kp-skeleton*` | Squelettes pour les pages ; indicateur rond seulement dans un bouton |
| Ligne de liste | `.kp-list`, `.kp-list__item` | 56 px, vignette, titre tronqué par une ellipse, texte complet dans `title` |
| Tableaux | nouveau : `.kp-table` dans `_components.scss` | Ordinateur : en-têtes collants, actions en fin de ligne ; tablette : colonnes secondaires masquées (`.kp-table__secondaire`) ; téléphone : une carte par ligne. Le tri est fait à l'écran (phase 3) |
| Frise d'étapes | nouveau : `src/app/shared/ui/frise.component.ts` | Entrée : liste d'étapes `{ libelle, detail?, etat: 'fait' | 'en-cours' | 'a-venir', icone? }`. Faites en olive, en cours avec halo, à venir en gris. Purement visuelle : **aucun calcul d'étape dans le composant** (les écrans le font en phases 3 et 4) |
| Avatar | `src/app/shared/ui/avatar.component.ts` | Initiales sur `--kp-surface-sunken`, tailles de `DS-Composants` |
| Cartes | `.kp-card` (vérifie le nom réel) | Rayon 20 px, `--kp-elev-0`, marge `--kp-card-pad` |

Mets aussi à jour `_base.scss` : fond `--kp-bg`, corps 15/22, titres en Figtree 500, liens, focus, sélection.

## Pièges et risques de régression repérés

- **Zoom iOS** : Safari zoome sur un champ dont la police fait moins de 16 px. Le corps passe à 15 px : garde `font-size: 16px` sur `input`, `select` et `textarea` en dessous de 768 px.
- **Texte sur l'olive** : `--kp-primary-on` valait nuit (sur olive claire). Avec l'olive foncée, le texte devient blanc. Vérifie tous les usages de `--kp-primary-on` (7) et de `--kp-primary` comme fond.
- **Ancienne barre latérale nuit** : `app-shell.component.scss` utilise `--kp-nav-*`. Les alias de cette phase la rendront claire. Vérifie qu'elle reste lisible (contraste de l'élément actif et des pastilles) en attendant la phase 2.
- **Couleurs en dur** (environ 60, liste dans `00-vue-ensemble.md`) : ne les remplace en phase 1 que dans les fichiers que tu touches déjà (`toasts.component.ts`, `app.scss`, `_components.scss`). Les autres viennent avec leur écran.
- **Tests qui lisent le DOM** : `cloche.component.spec.ts` (lien `a[href="/notifications"]`, `.kp-pastille`), `carte-bien.component.spec.ts` (`.kp-carte-bien`, `.kp-carte-bien__map`), `app.spec.ts` (textes « Hors ligne », « Mettre à jour »), `fin-de-bail.component.spec.ts` (textes « Donner congé », « Mettre fin au bail », « Retirer le congé »), `landing.component.spec.ts` (h1). Garde ces classes et ces textes.
- **Service worker** : `ngsw-config.json` met en cache les icônes et `index.html`. Pour vérifier le nouveau favicon et le manifeste, utilise une fenêtre sans cache (profil Edge temporaire) ou désinscris le service worker. `ng serve` ne l'active pas.
- **Thème sombre** : chaque nouveau jeton doit exister dans les deux mixins. Un jeton absent du sombre hérite silencieusement de la valeur claire.
- **Script de thème** dans `index.html` (lecture de `kp_theme`) et capture de `beforeinstallprompt` : ne pas les retirer en modifiant le `<head>`.
- **Leaflet** (`leaflet.css`) et les marqueurs de carte ont leurs propres couleurs (`carte-annonces.component.ts`, `carte-repere.component.ts`) : n'y touche pas avant la phase 5.

## Commits attendus (dans cet ordre, build vert à chaque fois)

1. `docs(refonte): plan et prompts de la refonte du front` (le dossier `docs/refonte-front/` tel quel)
2. `feat(ds): jetons --kp-* par rôle et alias des anciens noms`
3. `feat(ds): thème sombre décliné sur les nouveaux jetons`
4. `feat(ds): police Figtree`
5. `feat(identite): logo SVG, favicon, icônes d'application et manifeste`
6. `feat(ds): composant logo et en-tête des pages de connexion`
7. `feat(ds): boutons, champs et focus clavier`
8. `feat(ds): contrôle segmenté et onglets de page`
9. `feat(ds): badges d'état et frise d'étapes`
10. `feat(ds): toasts et bannières`
11. `feat(ds): fenêtres et panneaux`
12. `feat(ds): états vides, squelettes, lignes de liste, cartes et tableaux`
13. `docs(refonte): bilan de la phase 1` (ligne « Phase 1 » du tableau de suivi de `00-vue-ensemble.md`, et nouvelles évolutions s'il y en a)

Messages en français, format Conventional Commits. Ajoute la ligne `Co-Authored-By` si ton environnement en demande une. Avant chaque commit : `npm run build -- --configuration production`.

## Vérifications de fin de phase

1. **Build** : `npm run build -- --configuration production` passe sans erreur. Note les avertissements de budget s'il y en a.
2. **Tests existants avec Edge** (référence avant refonte : 119 sur 119) :
   ```powershell
   $env:CHROME_BIN = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
   npx ng test --watch=false --browsers=ChromeHeadless
   ```
   Tous doivent passer. Si un test casse à cause d'une classe ou d'un texte, corrige le rendu, pas le test. Seule exception : si la maquette impose le changement, tu modifies le test et tu le signales.
3. **Application utilisable** : lance l'API (`../kupanga-Api/GUIDE-DEMARRAGE.md`, `docker compose -f docker-compose-dev.yml up -d`) et `npm start`, puis parcours connexion, accueil, une fiche de bien, la messagerie et Explorer avec `claire.martin@kupanga.dev` / `Kupanga-Dev-2026`, en clair **et** en sombre.
4. **Comparaison aux maquettes** : capture avec Edge headless piloté par CDP (Node 24 : `fetch` + `WebSocket` natifs, script dans ton dossier temporaire, rien d'installé), à 1440 px et 390 × 844.
   - Il n'existe pas de page de démonstration : compare les composants **tels qu'ils apparaissent dans les écrans existants** (boutons et champs de la connexion, segmenté de la messagerie, badges de Mes biens, état vide, toasts, feuille du thème dans Compte) avec `DS-Fondations.png` et `DS-Composants.png`.
   - Compare le logo de la page de connexion avec `Identite-Logo-Final.png`.
   - Regarde les captures côte à côte avec l'outil Read.
5. **Liste des écarts restants**, composant par composant : ce qui diffère, pourquoi (attendu en phase N, contrainte du code, évolution), et si c'est à corriger.

## Rapport de fin de phase (à me donner, court)

- Ce qui est fait (commits avec leur hash court).
- Résultats : build, tests (X sur Y), vérification manuelle.
- Écarts avec les maquettes et pourquoi.
- Points à décider ou évolutions découvertes.
- Ce que fera la phase 2.

**Arrête-toi là.** N'enchaîne pas sur la phase 2 : elle sera lancée séparément.
