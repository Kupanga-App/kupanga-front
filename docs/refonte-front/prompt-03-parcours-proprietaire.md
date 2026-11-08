# Prompt · Phase 3 · Parcours propriétaire

> À donner tel quel à une nouvelle session de Claude Code ouverte dans `kupanga/kupanga-front`.

---

Tu réalises la **phase 3 sur 6** de la refonte UX/UI du front Kupanga (Angular 20, composants autonomes, signaux). Les phases 1 et 2 ont posé le design system (jetons `--kp-*`, Figtree, logo, composants transverses) et la navigation par profil. Cette phase refait les écrans du **propriétaire** : accueil, fiche du bien à onglets, bail et son assistant, états des lieux et leur assistant, quittances.

## Règles (non négociables)

- **Ne touche pas au back.** Aucun fichier de `../kupanga-Api/`.
- **Logique métier intacte.** Mêmes routes (`src/app/app.routes.ts`), mêmes appels API, mêmes données, mêmes règles de validation (`Validators` inchangés), mêmes guards. Tu peux réutiliser une méthode de service **déjà appelée ailleurs dans le front**. Tu ne peux pas appeler un endpoint que le front n'appelle pas encore.
- **Rien d'inventé.** Un chiffre, un statut ou un texte de maquette que les données ne permettent pas de calculer n'est pas affiché. Tu le notes comme écart, ou comme évolution s'il faut le serveur. Les photos de pièce de l'état des lieux sont l'évolution E1 : bloc omis.
- **Pas d'installation.** Edge à la place de Chrome.
- **Données** : parcours les assistants (bail, état des lieux, quittance, nouveau bien) jusqu'à l'écran de vérification **sans** cliquer sur l'action finale. Ne signe rien, ne crée rien. Si un écran ne peut pas être vérifié faute de données (bail déjà créé, état des lieux signé…), demande-moi avant de créer des données de test. Pas de `git push`.

## Branche

Continue sur `refonte-front` : `git checkout refonte-front`. Le dernier commit doit être `docs(refonte): bilan de la phase 2` et l'arbre doit être propre. Sinon, arrête-toi et signale-le.

## À lire avant de commencer

1. `docs/refonte-front/00-vue-ensemble.md` : règles, décisions, évolutions, tableau de suivi (écarts laissés par les phases 1 et 2).
2. `../frontend-audit/livraison-dev.md` : lignes « Accueil propriétaire », « Fiche du bien », « Bail », « États des lieux », « Quittances (propriétaire) » et le composant « Frise d'étapes ».
3. Maquettes (PNG puis HTML dans `../frontend-audit/maquettes/`) : `Nav-Proprio-Tableau`, `Fiche-Bien-Loue`, `Fiche-Bien-Vacant`, `Assist-Bail`, `Bail-A-Signer`, `Assist-EDL`, `Assist-EDL-Mobile`, `DS-Composants` (tableau des quittances).
4. L'existant : `../frontend-audit/documentation/cartographie-ecrans.md` (sections propriétaire) et `../frontend-audit/screenshots/` (dossiers accueil, biens, bail, EDL, quittances).
5. Le code :
   - `src/app/features/proprietaire/**` : accueil (`taches.ts` + spec), fiche, bail, edl, quittances, biens, `donnees-proprietaire.service.ts` ;
   - `src/app/features/biens/components/fin-de-bail.component.ts` (+ spec) et `src/app/features/biens/pages/assign-tenant/` ;
   - `src/app/shared/ui/assistant.component.ts`, `feuille-signature.component.ts`, `signature.component.ts`, `galerie.component.ts`, `carte-bien.component.ts`, `src/app/shared/components/carte-bien/`, `carte-repere/`, `src/app/shared/ui/lieux-proches.component.ts`, `statut.component.ts`, `frise.component.ts` (phase 1).

## Écrans à réaliser

### 1. Accueil propriétaire · `/accueil` · maquette `Nav-Proprio-Tableau`

Fichiers : `features/proprietaire/accueil/accueil.component.{ts,html,scss}`, `taches.ts`.

- En-tête : titre « {mois année} », sous-titre « {prénom nom} · {n} biens », bouton principal « Ajouter un bien » (`/biens/nouveau`).
- Trois cartes de chiffres :
  - **Biens loués** : « x sur y », avec le taux d'occupation et une barre de progression ;
  - **Loyer attendu** du mois : somme loyer + charges des biens loués, et « dont N de charges ». L'échéance et « Pas encore déclaré reçu » viennent des quittances du mois (`dateEcheance`, `statut`). Si aucune quittance du mois n'existe, n'affiche pas ces deux mentions.
  - **Annonces en ligne** : biens actifs sans locataire. Vérifie dans le code comment un bien est considéré publié ; ne compte pas une réservation en cours comme une annonce.
  Toutes ces valeurs se calculent à partir de `DonneesProprietaireService.charger()`, **déjà appelé**. Si une devise diffère d'un bien à l'autre (France et RDC sur le même compte), ne fais pas de somme mélangée : un montant par devise, ou signale l'écart.
- Carte « bien en cours » avec la **frise** Annonce → Réservation → Bail → État des lieux → Quittances, la prochaine étape et son action (« Créer le bail » → `/biens/:id/bail/nouveau`…). L'état de chaque étape se déduit de `reservation`, `location`, des contrats, des états des lieux et des quittances déjà chargés. Écris ce calcul dans une **fonction pure testée**, par exemple `etapes-location.ts` + spec, réutilisable par la fiche du bien.
- « À faire aussi » : les tâches de `calculerTaches()` (`taches.ts`), **sans changer leurs règles**.
- « Mes biens » : liste de lignes de 56 px (vignette, titre, ville · locataire, badge d'état avec point, loyer) et contrôle segmenté Tous · Loués · Vacants avec compteurs, filtre fait à l'écran.
- **Attention : cet écran sert à tous les profils** (lot 3, pas de rôle). Les sections pour les comptes qui louent ou cherchent (logements loués, `DemandesRecuesComponent`, réservations) doivent continuer à s'afficher pour eux. L'organisation candidat (`Nav-Candidat`) vient en phase 4. Ici, garde ces sections fonctionnelles, avec les nouveaux composants.

### 2. Fiche du bien · `/biens/:id` · maquettes `Fiche-Bien-Loue`, `Fiche-Bien-Vacant`

Fichiers : `features/proprietaire/fiche/fiche-bien.component.{ts,html,scss}`. Crée un composant d'en-tête partagé, par exemple `features/proprietaire/fiche/fiche-entete.component.ts`, utilisé par les quatre pages du bien.

- En-tête : fil « ‹ Mes biens », titre, état (point + texte, par exemple « Vacant · annonce en ligne »), loyer, ville. À droite : « Voir l'annonce » (`/annonces/:id`), « Modifier le bien » (`/biens/:id/modifier`) et un menu « … » qui ne reprend **que des actions existantes**.
- **Onglets de page** (contrôle segmenté en liens) :
  - bien loué : Vue d'ensemble (`/biens/:id`) · Bail (`/biens/:id/bail`) · États des lieux (`/biens/:id/etats-des-lieux`) · Quittances (`/biens/:id/quittances`). Ce sont **les routes existantes** ; l'en-tête et les onglets se répètent sur chacune.
  - bien vacant : Vue d'ensemble · Annonce. **Aucune route n'existe pour « Annonce »** et tu n'en crées pas. Fais-en un onglet local de `/biens/:id` (signal, pas de route) qui montre l'état de publication et les éléments de l'annonce disponibles dans `BienDTO`, avec les liens « Voir l'annonce » et « Modifier ». Si la maquette demande plus, note l'écart.
- Vue d'ensemble : prochaine étape (vacant : « Choisissez votre locataire », avec la dernière personne qui a écrit, « Ouvrir la conversation » et « Proposer la location » → `/biens/:id/locataire`) ; photos (`galerie.component.ts`, « Voir les photos ») ; frise « Où en est la location » (fonction de l'accueil) ; caractéristiques en tuiles (type, surface, pièces, meublé, DPE, loyer), équipements, lieux à moins de 5 km (`lieux-proches.component.ts`) ; locataire ; documents ; localisation (`carte-repere`, « position publique arrondie à 100 m » pour un bien vacant, « Itinéraire »). Étapes terminées en olive clair.
- « La dernière personne qui a écrit » : réutilise le service de messagerie **déjà appelé** par l'application (liste des conversations) et filtre sur le bien. Sinon, ne l'affiche pas et signale-le.
- Fin de bail (`fin-de-bail.component.ts`, « Mettre fin au bail ») : garde-le, ses textes sont testés.

### 3. Bail · `/biens/:id/bail` et `/biens/:id/bail/nouveau` · maquettes `Bail-A-Signer`, `Assist-Bail`

Fichiers : `features/proprietaire/bail/*`, `shared/ui/assistant.component.ts`, `shared/ui/feuille-signature.component.ts`.

- Page du bail (`Bail-A-Signer`) : onglet « Bail » de la fiche. Il montre le bail créé, l'état des signatures et l'action « Signer » du propriétaire (`signerProprio`, inchangé) dans la feuille de signature restylée, puis le PDF. **On crée le bail, puis on signe depuis sa page**, comme aujourd'hui.
- Assistant (`Assist-Bail`) : plein écran (route `pleinEcran` déjà en place), étapes à gauche ou en haut, **aperçu du bail en direct** construit avec les valeurs du formulaire (parties, logement, durée, loyer et charges, dépôt ou garantie et avance en RDC). Pas de texte juridique inventé : c'est l'évolution E2.
- **Dépôt de garantie** : la maquette montre un avertissement non bloquant. Le formulaire actuel a `depotGarantie: [null, [Validators.min(0)]]`, `garantieMois` max 24, `avanceMois` max 24. Garde exactement ces règles. L'avertissement s'affiche **en plus**, à titre d'information. S'il suppose une règle (par exemple un plafond légal) que le code ne connaît pas, ne l'invente pas et signale-le.
- **Problèmes de l'audit à corriger dans `kp-assistant`**, qui sert aussi à `bien-create` et `nouvel-edl` :
  - « Continuer » grisé sans dire ce qui manque : ajoute une entrée optionnelle (par exemple `manque: string | null`) affichée près du bouton. Chaque assistant la renseigne à partir de son formulaire **sans changer `etapeValide()`**.
  - « Quitter » efface la saisie sans confirmation : quand le formulaire a été modifié (`dirty`), « Quitter » ouvre une fenêtre de confirmation (composant fenêtre de la phase 1). La sortie `quitter` existante n'est émise qu'après confirmation.

### 4. États des lieux · `/biens/:id/etats-des-lieux` et `/nouveau` · maquettes `Assist-EDL`, `Assist-EDL-Mobile`

Fichiers : `features/proprietaire/edl/*`, `models/edl-libelles.ts`.

- Liste : onglet « États des lieux » de la fiche, entrée et sortie avec badges d'état, PDF, signature du propriétaire (`signerProprietaire`, inchangé).
- Assistant : **une pièce à la fois**. Sur téléphone, le libellé court « H.S. » remplace « Hors service » : c'est un libellé d'affichage, la valeur envoyée reste `HORS_SERVICE`. Compteurs selon le pays (`compteursEdl` de `GET /juridictions/{pays}`, inchangé).
- **Pas de bloc photos** (E1).

### 5. Quittances · `/biens/:id/quittances` et `/nouvelle` · maquettes `Fiche-Bien-Loue` (onglet), `DS-Composants` (tableau)

Fichiers : `features/proprietaire/quittances/*`.

- Tableau `.kp-table` : mois, montant (`.kp-montant`), échéance, paiement, badge d'état (`EN_ATTENTE`, `PAYEE`, `EN_RETARD`, `IMPAYEE`), PDF en fin de ligne, tri à l'écran. Sur tablette, les colonnes secondaires sont masquées ; sur téléphone, une carte par ligne.
- Nouvelle quittance (`pleinEcran`) : restyle avec les champs de la phase 1, mêmes champs et mêmes règles.

### 6. Écrans propriétaire sans maquette

`/biens` (Mes biens), `/biens/:id/modifier`, `/biens/nouveau` (assistant), `/biens/:id/locataire` (Proposer la location) : applique les jetons et les composants **sans changer l'organisation**. Remplace les couleurs en dur de `bien-create.component.scss` et `nouvel-edl.component.scss`.

## Pièges et risques de régression repérés

- **Données lues bien par bien** : `DonneesProprietaireService` lit les états des lieux et les quittances bien par bien, parce que l'API ne renvoie pas le `bienId` d'une quittance ; le service l'ajoute. Ne remplace pas ces appels.
- `ContratService.search({ size: 50 })` renvoie **aussi** les baux où le compte est locataire : le service filtre sur les biens possédés. Garde ce filtre.
- **`fiche-bien.component.ts`** prend le premier contrat (`contrats()[0]`) et la première quittance comme les plus récents : vérifie l'ordre avant de t'appuyer dessus pour la frise.
- **`urlPdf`** est une URL signée qui expire au bout de quelques minutes. Si une page reste ouverte longtemps, le lien meurt. Ne la mets pas en cache plus longtemps qu'aujourd'hui et ne change pas la façon de l'obtenir.
- **`kp-assistant`** est partagé par trois assistants : toute modification doit être vérifiée sur `bien-create`, `nouveau-bail` et `nouvel-edl`, y compris le bouton retour système sur téléphone.
- **France / RDC** : champs et libellés selon le pays (`juridiction.service.ts`, `champVisible`). Vérifie chaque écran avec Claire (France) et Patrick (RDC) : garantie en mois, loyers d'avance, compteurs, devise.
- **Tirer pour actualiser** (`tirer-pour-actualiser.directive.ts`) sur l'accueil : garde-le.
- **Spec `taches.spec.ts`** : les règles des tâches ne changent pas.
- **Spec `fin-de-bail.component.spec.ts`** : les textes « Donner congé », « Mettre fin au bail » et « Retirer le congé » restent.
- **Accueil multi-profils** : un compte qui possède des biens et loue un logement voit les deux. Teste avec un compte qui possède des biens (Claire) et vérifie que les sections « logements loués » restent correctes (code de l'accueil).

## Commits attendus (dans cet ordre, build vert à chaque fois)

1. `feat(proprietaire): calcul des étapes de la location (fonction testée)`
2. `feat(proprietaire): accueil, chiffres du mois et liste des biens filtrable`
3. `feat(proprietaire): en-tête et onglets de la fiche du bien`
4. `feat(proprietaire): vue d'ensemble du bien loué et du bien vacant`
5. `feat(ds): l'assistant dit ce qui manque et confirme avant de quitter`
6. `feat(bail): assistant avec aperçu en direct`
7. `feat(bail): page du bail à signer`
8. `feat(edl): liste des états des lieux et assistant pièce par pièce`
9. `feat(quittances): tableau des quittances du bien et nouvelle quittance`
10. `style(proprietaire): jetons et composants sur Mes biens, Modifier, Nouveau bien et Proposer la location`
11. `docs(refonte): bilan de la phase 3`

Messages en français, format Conventional Commits. Ajoute la ligne `Co-Authored-By` si ton environnement en demande une. Avant chaque commit : `npm run build -- --configuration production`.

## Vérifications de fin de phase

1. **Build** : `npm run build -- --configuration production`.
2. **Tests existants avec Edge** : tous passent, plus les nouveaux (étapes de location, `kp-assistant`).
   ```powershell
   $env:CHROME_BIN = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
   npx ng test --watch=false --browsers=ChromeHeadless
   ```
3. **Application utilisable** : API locale et `npm start`, comptes `claire.martin@kupanga.dev` et `patrick.mbuyi@kupanga.dev` (mot de passe `Kupanga-Dev-2026`).
   - Parcours accueil → fiche d'un bien loué → ses quatre onglets → fiche d'un bien vacant → onglet Annonce.
   - Assistants bail et état des lieux jusqu'à la vérification, sans valider. Teste « Quitter » avec et sans saisie, et le message « ce qui manque ».
   - Le tout sur ordinateur et sur téléphone, en clair et en sombre.
4. **Non-régression des appels** : dans les outils réseau (ou par CDP `Network.*`), vérifie que l'accueil et la fiche font **les mêmes requêtes qu'avant** : mêmes adresses, même nombre à peu près. Compare avec la branche `feature/pret-pour-la-prod` si besoin.
5. **Comparaison aux maquettes** : captures Edge headless par CDP (script Node 24 dans ton dossier temporaire) à 1440 px et 390 × 844, lues côte à côte avec Read.
   - Accueil → `Nav-Proprio-Tableau`.
   - Fiche louée → `Fiche-Bien-Loue`.
   - Fiche vacante → `Fiche-Bien-Vacant`.
   - Assistant bail → `Assist-Bail`.
   - Page du bail → `Bail-A-Signer`.
   - Assistant état des lieux → `Assist-EDL` (ordinateur) et `Assist-EDL-Mobile` (téléphone).
   - Quittances → onglet de `Fiche-Bien-Loue` et tableau de `DS-Composants`.
   Les écrans qui demandent un bail ou un état des lieux existants ne sont peut-être pas couverts par les données de démo : demande-moi avant d'en créer.
6. **Écarts restants**, écran par écran, avec leur raison.

## Rapport de fin de phase (à me donner, court)

- Commits (hash court + message).
- Build, tests (X sur Y), parcours vérifiés.
- Écarts avec les maquettes et pourquoi, dont les chiffres non affichés faute de données.
- Évolutions découvertes (ajoutées dans `00-vue-ensemble.md`).
- Écrans non vérifiés faute de données, et ce qu'il faudrait créer.
- Ce que fera la phase 4.

**Arrête-toi là.** N'enchaîne pas sur la phase 4.
