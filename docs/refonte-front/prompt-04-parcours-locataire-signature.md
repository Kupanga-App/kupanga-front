# Prompt · Phase 4 · Parcours locataire, candidat et signature par lien

> À donner tel quel à une nouvelle session de Claude Code ouverte dans `kupanga/kupanga-front`.

---

Tu réalises la **phase 4 sur 6** de la refonte UX/UI du front Kupanga (Angular 20, composants autonomes, signaux). Les phases 1 à 3 ont posé le design system, la navigation par profil et les écrans du propriétaire. Cette phase refait les écrans de **celui qui loue ou cherche** : Mon logement, ses quittances, le logement réservé, l'accueil candidat, puis la **signature par lien**, sans compte (bail et état des lieux, sur ordinateur et sur téléphone, avec les liens invalides).

## Règles (non négociables)

- **Ne touche pas au back.** Aucun fichier de `../kupanga-Api/`.
- **Logique métier intacte.** Mêmes routes, mêmes appels API, mêmes données, mêmes règles de validation, mêmes guards. Les adresses `/contrats/signer/:token` et `/edl/signer/:token` sont dans les e-mails de l'API : **elles ne changent pas**. Tu peux réutiliser une méthode de service déjà appelée ailleurs dans le front, pas un endpoint nouveau.
- **Rien d'inventé.** « Favoris » (E4), « alertes » (E5), texte complet du bail (E2) et image de la signature du bailleur (E3) ne sont pas construits. Voir `00-vue-ensemble.md`.
- **Pas d'installation.** Edge à la place de Chrome.
- **Données** : **ne signe rien**, n'accepte ni ne refuse aucune demande, ne donne pas congé. Arrête-toi avant l'action finale. Pour les pages de signature avec un lien valide, il faut un jeton réel : demande-moi avant d'en créer un, par exemple en créant un bail de test. Pas de `git push`.

## Branche

Continue sur `refonte-front` : `git checkout refonte-front`. Le dernier commit doit être `docs(refonte): bilan de la phase 3` et l'arbre doit être propre. Sinon, arrête-toi et signale-le.

## À lire avant de commencer

1. `docs/refonte-front/00-vue-ensemble.md` : règles, décisions (« J'ai lu… », PDF, aperçu du bail, 404 / 410 / 409, accueil locataire), évolutions, suivi.
2. `../frontend-audit/livraison-dev.md` : lignes « Mon logement », « Accueil candidat », « Signature par lien », et le composant « Frise d'étapes ».
3. Maquettes (PNG puis HTML dans `../frontend-audit/maquettes/`) : `Mon-Logement`, `Mon-Logement-Quittances`, `Mon-Logement-Reserve`, `Nav-Candidat` (contenu), `Nav-Mobile` (téléphones locataire et candidat), `Signer-Bail`, `Signer-Mobile`, `Signer-Lien-Invalide`. La planche `Nav-Locataire` est retirée : ne la suis pas.
4. L'existant : `../frontend-audit/documentation/cartographie-ecrans.md` (sections locataire, demandes, signature) et `../frontend-audit/screenshots/`.
5. Le code :
   - `src/app/features/locataire/*` : `mon-logement`, `mes-quittances`, `demandes-recues`, `locataire.models.ts` ;
   - `src/app/features/signature/signer-contrat.component.ts`, `signer-edl.component.ts` ;
   - `src/app/core/http/api-error.ts` (`messageLienSignature`, ligne 60) + spec ;
   - `src/app/core/auth/ui/auth-layout.component.ts` ;
   - `src/app/shared/ui/signature.component.ts`, `feuille-signature.component.ts` ;
   - `src/app/features/biens/components/fin-de-bail.component.ts` (+ spec) ;
   - `src/app/features/gestion-logement/components/bouton-whatsapp/` ;
   - `src/app/features/proprietaire/accueil/*` (l'accueil commun) ;
   - la fonction d'étapes de location créée en phase 3.

## Écrans à réaliser

### 1. Mon logement · `/mon-logement` · maquette `Mon-Logement`

Fichiers : `features/locataire/mon-logement.component.{ts,html,scss}`.

- En-tête : titre du logement, adresse, « propriétaire : {prénom} {initiale}. ».
- Onglets de page (contrôle segmenté en liens, **routes existantes**) : Logement (`/mon-logement`) · Documents (`/documents`) · Quittances (`/quittances`) · Messages (`/messages` avec les `queryParams` de `lienMessage()`, déjà calculés). L'en-tête et les onglets se répètent sur `/quittances`. Sur `/documents` et `/messages`, pages communes, ne les ajoute pas sans vérifier que c'est cohérent pour un propriétaire ; sinon, signale l'écart.
- **À faire** en tête : le premier document à signer de `aSigner()`, avec le bouton « Lire et signer » qui mène à `d.lien`. **Piège** : ce lien vient des **notifications** (`n.lien` de `AppNotificationService`, `mon-logement.component.ts:103-118`). Sans notification, `lien` vaut `null` : affiche alors le texte « Vous recevez le lien par e-mail » sans bouton, comme aujourd'hui.
- Frise « Où en est votre location » : Demande acceptée → Bail créé → Votre signature → État des lieux → Quittances, calculée avec les données **déjà chargées** (tableau de bord `GET /locataire/dashboard/{bienId}`, bien, notifications). Réutilise ou complète la fonction pure de la phase 3, avec des tests.
- Photos (`galerie`, « Voir les N photos », « 1 / N »), caractéristiques en tuiles, équipements, lieux à moins de 5 km. La maquette montre un lien « Modifier » sur les caractéristiques : **le locataire ne modifie pas le bien**, donc pas de lien (écart à noter).
- Mon loyer : loyer, charges, total par mois, dépôt de garantie, et la mention « Le loyer se paie directement à votre propriétaire, hors de l'application ».
- Votre propriétaire : avatar, nom, Message · Appeler (`lienAppel`) · WhatsApp (`bouton-whatsapp`).
- Localisation : carte et « Itinéraire ».
- **Fin de location** : bloc en bas avec « Donner congé » en bouton danger contour (`fin-de-bail.component.ts`). Ses textes sont testés.

### 2. Quittances du locataire · `/quittances` · maquette `Mon-Logement-Quittances`

Fichier : `features/locataire/mes-quittances.component.ts`.

- En-tête et onglets de Mon logement, onglet Quittances actif.
- **Quittances groupées par année** (regroupement à l'écran, sur les données actuelles), badge d'état, montant `.kp-montant`, PDF. Une carte par ligne sur téléphone.

### 3. Logement réservé · `/mon-logement` (état réservé) · maquette `Mon-Logement-Reserve`

- Quand le logement est réservé pour le compte (`reservation` du bien, `dateExpiration`) : **compte à rebours** des 14 jours, en jours restants calculés **à l'écran** à partir de `dateExpiration`. Ne recalcule pas la durée de 14 jours : lis la date.
- Repère dans le code comment l'écran sait aujourd'hui que le logement est réservé (`demandes-recues.component.ts`, `LocationService`, tableau de bord) et garde la même source.

### 4. Accueil candidat · `/accueil` · maquette `Nav-Candidat` (+ téléphone candidat de `Nav-Mobile`)

Fichiers : `features/proprietaire/accueil/*` (accueil commun) et `features/locataire/demandes-recues.component.ts`.

- Pour le profil **candidat** (ni bien ni logement, signal `profil` de `NavigationService`, phase 2) :
  - titre « Votre recherche de logement », sous-titre « {prénom nom} · N conversations en cours » ;
  - **demande à traiter en tête** : photo, « {propriétaire} vous propose la location de {bien} », loyer, pièces, surface, « Si vous acceptez, le logement vous est réservé 14 jours », et les boutons Refuser (secondaire) et Accepter (principal). Ce sont les actions `accepter()` et `refuser()` existantes de `DemandesRecuesComponent`, **inchangées**, y compris la confirmation de refus. Le texte « 14 jours » doit venir de la donnée (`dateExpiration` de la demande) ou du texte actuel du code, pas d'une constante nouvelle.
  - conversations en cours (service de messagerie déjà appelé, « Tout voir » → `/messages`) ;
  - raccourcis « Trouver un logement » (`/explorer`, sous-titre **sans « alertes »**) et « Mettre un bien en location » (`/biens/nouveau`).
  - **Pas de tuile ni d'entrée « Favoris »** (E4).
- Les autres profils gardent l'accueil de la phase 3. Le locataire sans bien n'y arrive plus par défaut, mais peut l'ouvrir depuis sa navigation : vérifie qu'il reste correct pour lui.
- L'écran `/demandes-location` reste joignable. Rappelle dans ton rapport qu'il n'a toujours pas d'entrée de menu.

### 5. Signature par lien · `/contrats/signer/:token`, `/edl/signer/:token` · maquettes `Signer-Bail`, `Signer-Mobile`, `Signer-Lien-Invalide`

Fichiers : `features/signature/signer-contrat.component.ts`, `signer-edl.component.ts`, et un nouveau gabarit de page publique de signature (par exemple `features/signature/signature-layout.component.ts`). Ne modifie pas `auth-layout.component.ts`, qui sert aussi à la connexion, au-delà de ce que la phase 1 a fait.

- **Ordinateur (`Signer-Bail`)** : barre blanche avec logo et « Lien personnel, sans compte » (cadenas).
  - À gauche, l'**aperçu du bail construit avec les champs du contrat** (décision) : 1. Parties (`proprietaire`, `locataire`), 2. Logement (`adresseBien`), 3. Durée (`dateDebut`, `dureeBailMois`), 4. Loyer et charges, 5. Dépôt de garantie, ou garantie en mois et loyers d'avance en RDC. Pas de texte juridique inventé (E2). En bas, « Le bailleur » avec « Signé par {prénom nom} le {date} » (`proprietaireASigné`, `dateSignatureProprietaire`, E3), et « Le locataire » avec le cadre « Votre signature ».
  - À droite, une carte collante : « Bail envoyé par {prénom} {initiale}. », titre, tuiles Début / Durée / Loyer + charges / Dépôt, badge « Signé par le bailleur ».
  - Sous les tuiles, la **case « J'ai lu le bail en entier et j'accepte de le signer »**, puis le bouton principal « Signer le bail », **désactivé tant que la case n'est pas cochée** (décision). La case n'est pas envoyée à l'API : l'appel `signerByToken(token, signatureBase64)` est inchangé.
  - Enfin, le lien « Télécharger le PDF pour le relire » et la mention « Une question sur le bail ? Écrivez à … depuis votre espace Kupanga avant de signer ».
  - « Signer le bail » ouvre la fenêtre « Votre signature » (`kp-signature`) avec « Signez à la souris ou au doigt dans le cadre », le nom et la date sous le trait, puis Effacer et « Valider ma signature ».
- **Téléchargement du PDF** (décision) : au clic, relance `getByToken(token)` (même appel `GET`) et ouvre le `urlPdf` **frais** dans un nouvel onglet, parce que l'URL signée expire au bout de quelques minutes. Pendant l'appel, indicateur dans le lien ; en cas d'erreur, message dans une bannière. **Piège** : un `window.open` après un appel asynchrone est bloqué par les navigateurs. Ouvre l'onglet **au clic**, puis renseigne son adresse quand la réponse arrive (ou une autre technique sûre), et vérifie sur Edge et sur Safari iOS.
- **Téléphone (`Signer-Mobile`)** : **3 étapes**, d'après la maquette (par exemple : lire le résumé, cocher « J'ai lu… », signer au doigt), avec un bouton d'action collé en bas au-dessus de la zone sûre.
- **Liens invalides (`Signer-Lien-Invalide`)** : un écran dédié avec illustration, titre, explication et actions (« Mes documents » si connecté, sinon « Se connecter » ; ou « Écrire au propriétaire » si la maquette le prévoit et que l'action existe).
  - Un message distinct par cas : **404** lien inconnu, **410** lien expiré (« Demandez au propriétaire de vous en renvoyer un »), **409** déjà signé.
  - Les messages viennent de `messageLienSignature()` (`api-error.ts:60`), qui gère 404 et 410. Pour 409, vérifie ce que renvoie l'API et ce que fait `messageErreurApi`. Si tu complètes la fonction, garde ses retours actuels et ajoute des tests dans `api-error.spec.ts`.
  - Expose le **code** (404, 410 ou 409) au composant pour choisir l'illustration, plutôt que de comparer des textes.
- **État des lieux** (`signer-edl.component.ts`) : même gabarit, même case « J'ai lu l'état des lieux en entier… », même logique de PDF. L'aperçu reprend les données déjà affichées aujourd'hui (pièces, éléments, compteurs, clés).
- **Après la signature** : écran « Bail signé » restylé. Le lien « Voir mon logement » ou « Se connecter » est inchangé.

## Pièges et risques de régression repérés

- **Pages publiques** : la signature fonctionne **sans compte**. Aucun guard, et pas de redirection vers la connexion sur 401 : l'API renvoie 404 ou 410 précisément pour éviter que l'intercepteur traite une erreur comme une session expirée (`ContratServiceImpl.java:245`). Ne change pas `auth.interceptor.ts`.
- **`connecte()`** décide des liens de fin (Mon logement ou Se connecter) : garde ce comportement.
- **Double envoi** : le bouton reste désactivé pendant `envoi()`.
- **`signature.component.ts`** : signature au doigt sur téléphone. Le défilement de la page ne doit pas gêner le tracé (`touch-action: none` dans le cadre). Vérifie dans la fenêtre comme dans l'étape 3 sur téléphone.
- **Notifications** : `aSigner()` dépend des notifications chargées. Si elles arrivent après le tableau de bord, le bouton « Lire et signer » apparaît en retard : c'est normal, ne le force pas.
- **Locataire RDC** (`grace.mukendi@kupanga.dev`) : devise, garantie en mois, avance, compteurs (Cash Power…). Vérifie chaque écran avec elle.
- **Hors ligne** : `compte-cache.interceptor.ts` met en cache `/locataire/dashboard/*` et `/quittances/mes-quittances`. Mon logement doit rester lisible hors ligne.
- **Spec `fin-de-bail`** : textes inchangés.

## Commits attendus (dans cet ordre, build vert à chaque fois)

1. `feat(locataire): frise de la location du locataire (fonction testée)`
2. `feat(locataire): Mon logement, à faire, loyer, propriétaire et fin de location`
3. `feat(locataire): en-tête et onglets de Mon logement`
4. `feat(locataire): quittances groupées par année`
5. `feat(locataire): logement réservé avec compte à rebours`
6. `feat(candidat): accueil candidat avec la demande à traiter en tête`
7. `feat(signature): gabarit de page publique de signature`
8. `feat(signature): bail à signer avec aperçu, case « J'ai lu » et PDF rechargé`
9. `feat(signature): parcours en 3 étapes sur téléphone`
10. `feat(signature): écran des liens invalides (404, 410, 409)`
11. `feat(signature): même parcours pour l'état des lieux`
12. `docs(refonte): bilan de la phase 4`

Messages en français, format Conventional Commits. Ajoute la ligne `Co-Authored-By` si ton environnement en demande une. Avant chaque commit : `npm run build -- --configuration production`.

## Vérifications de fin de phase

1. **Build** : `npm run build -- --configuration production`.
2. **Tests existants avec Edge** : tous passent, plus les nouveaux (frise du locataire, messages des liens).
   ```powershell
   $env:CHROME_BIN = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
   npx ng test --watch=false --browsers=ChromeHeadless
   ```
3. **Application utilisable** : API locale et `npm start`, mot de passe `Kupanga-Dev-2026`.
   - `lucas.bernard@kupanga.dev` et `grace.mukendi@kupanga.dev` : arrivée sur Mon logement, onglets, quittances, « Donner congé » ouvert puis annulé.
   - `ines.moreau@kupanga.dev` : accueil candidat. Si aucune demande n'existe, l'état vide est correct.
   - Signature : `/contrats/signer/jeton-inconnu` (404) sans compte. Pour 410, 409 et un lien valide, il faut des données : **demande-moi** avant d'en créer.
   - Ordinateur et téléphone, clair et sombre.
4. **Comparaison aux maquettes** : captures Edge headless par CDP (script Node 24 dans ton dossier temporaire), lues côte à côte avec Read.
   - Mon logement (1440) → `Mon-Logement`.
   - Quittances → `Mon-Logement-Quittances`.
   - Logement réservé → `Mon-Logement-Reserve` (si les données le permettent).
   - Accueil candidat → `Nav-Candidat`, et téléphone candidat ou locataire → `Nav-Mobile`.
   - Signature sur ordinateur → `Signer-Bail`, sur téléphone (390 × 844) → `Signer-Mobile`.
   - Lien invalide → `Signer-Lien-Invalide`.
5. **Écarts restants**, écran par écran, avec leur raison.

## Rapport de fin de phase (à me donner, court)

- Commits (hash court + message).
- Build, tests (X sur Y), parcours vérifiés.
- Écarts avec les maquettes et pourquoi.
- Écrans non vérifiés faute de données (lien valide, 410, 409, logement réservé, demande reçue), et les données de test à créer si je l'accepte.
- Évolutions découvertes (ajoutées dans `00-vue-ensemble.md`).
- Ce que fera la phase 5.

**Arrête-toi là.** N'enchaîne pas sur la phase 5.
