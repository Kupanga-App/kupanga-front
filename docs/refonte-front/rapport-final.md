# Refonte du front Kupanga · Rapport final (phase 6)

Rédigé le 8 novembre 2026, sur la branche `refonte-front` (phase 6 partie de `45f7976`, avec l'accord de Gédéon :
cinq commits étaient venus après le bilan de la phase 5). Rien n'est poussé.

## 1. Tests

### Résultats du dernier passage complet (`npm run e2e`)

| Projet | Tests | Passés | Échoués | Ignorés | Rôle |
| --- | --- | --- | --- | --- | --- |
| `connexion` | 5 | 5 | 0 | 0 | Connexion par l'écran, états de session |
| `ordinateur` | 74 | 62 | 0 | 12 | Parcours (6 fichiers + retour de l'assistant d'EDL) et 21 instantanés, 1440 × 900 |
| `telephone` | 74 | 72 | 0 | 2 | Les mêmes et 29 instantanés, 390 × 844 tactile |
| `reference` | 40 | 40 | 0 | 0 | Non-régression : 33 écrans d'appels, 7 écrans de valeurs affichées |
| `conformite` | 26 | 26 | 0 | 0 | Comparaison aux maquettes (non bloquant) |

Les tests ignorés sont voulus : un test propre au téléphone ne tourne pas sur ordinateur (geste retour, parcours
en trois étapes de la signature, écrans `Nav-Mobile`…) et inversement (clavier physique, onglet du PDF).

**Total : 205 passés, 0 échec, 14 ignorés.** Durée : 7 min 34 s avec 4 onglets en parallèle (Edge 157, API locale). Tests unitaires : **207 sur 207** avec Edge
(198 en fin de phase 5, plus 2 des écrans d'auth refaits après, plus 7 de la garde de sortie). Build de production
vert ; paquet initial **512,5 ko** (avertissement au-delà de 500 ko, inchangé depuis la phase 5).

Stabilité : chaque fichier a été rejoué 2 à 3 fois de suite sans échec. Trois instabilités vues sous charge ont été
corrigées dans les tests (attente de l'historique d'une conversation, de la réponse 404 réelle d'un lien inconnu, de
la dernière recherche d'Explorer) ; aucune ne venait de l'application.

### Relancer

```powershell
npm run e2e                                         # API locale lancée ; ng serve réutilisé ou lancé
npx playwright test --project=ordinateur            # un projet
npx playwright show-report                          # rapport HTML
```

Tout est décrit dans `e2e/README.md` (comptes, limite de connexion, référence, instantanés, lecture des rapports).

### Ce que couvrent les parcours

| Fichier | Compte | Vérifié |
| --- | --- | --- |
| `visiteur.spec.ts` | — | Landing (RDC par défaut, bascule France), Annonces → Explorer, filtres dans l'adresse rechargés à l'identique, trois vues (Liste / Carte sur téléphone), annonce France (DPE, GES, dépôt) et RDC (courant, garantie, avance), « Contacter » → `/auth/login?returnUrl=…` |
| `proprietaire.spec.ts` | Claire, Patrick | Barre latérale ou onglets du bas ; accueil (6 biens, 1 loué, relus sur `GET /users/biens`) et filtres ; fiche louée et ses 4 onglets ; assistant de bail (manque, « Quitter ») ; création du bail et de l'EDL **interceptées**, corps vérifiés ; « H.S. » sur téléphone, pas de photos ; quittances en tableau / cartes ; messagerie (barre gardée, retour, Non lues, message **intercepté**) ; RDC : dollars, garantie en mois, rappel WhatsApp |
| `locataire.spec.ts` | Lucas, Grâce, Inès | Arrivée sur `/mon-logement`, barre du haut et menu ; onglets ; quittances par année ; « Donner congé » **intercepté** (`{ dateFin }`) ; bail à signer de Grâce ; logement réservé **simulé** (compte à rebours, frise) |
| `candidat.spec.ts` | Inès | Accueil candidat sans « Favoris » ; demande **simulée** ; « Accepter » = `POST /demandes-location/{id}/accepter` sans corps (**intercepté**) ; « Refuser » confirme |
| `signature.spec.ts` | — | Bail et EDL sur jeton **simulé** : aperçu, « Signé par … le … », case « J'ai lu… », tracé souris / doigt, `POST /signer/:token` **intercepté** avec `signatureBase64`, écran final ; PDF relu au clic ; 410 et 409 simulés, 404 réel ; trois messages distincts ; trois étapes sur téléphone |
| `transverse.spec.ts` | Claire, Lucas | Thème sombre gardé au rechargement ; lien d'évitement et anneau de focus ; Échap ferme et rend le focus ; toast ; hors ligne sur Mon logement |
| `edl-retour-navigateur.spec.ts` | Claire | Garde de sortie (téléphone) : retour sans saisie, avec saisie (« Continuer la saisie » garde la saisie), « Quitter » sans seconde question |

## 2. Non-régression des appels à l'API

**Méthode.** 33 écrans (visiteur, Claire, Patrick, Lucas, Grâce, Inès ; liste dans `e2e/non-regression/scenario.ts`)
chargés un par un sans clic ; appels relevés (méthode, chemin normalisé, clés de paramètres et de corps, empreinte
des réponses GET). Référence : `feature/pret-pour-la-prod`, build de développement dans un worktree, servie par
Playwright sous l'origine `http://localhost:4200` (l'API et son CORS ne changent pas, le `ng serve` de la refonte
n'est pas arrêté). Enregistrée après le désistement d'Inès, sur l'état final de la base.

**Résultat : aucun écart non justifié.** Mêmes appels, mêmes clés de corps et de paramètres, mêmes réponses sur les
33 écrans, sauf les écarts ci-dessous, tous issus de décisions des phases 3 à 5 (règle 2 : méthode de service déjà
appelée ailleurs).

| Appel | Écrans | Sens | Justification |
| --- | --- | --- | --- |
| `POST /conversations/search` | accueil de Claire et Patrick | en plus | Phase 5 : conversations en cours sur l'accueil propriétaire |
| `POST /conversations/search` | accueil d'Inès | en plus | Phase 4 : conversations sur l'accueil candidat |
| `POST /conversations/search` | fiche du bien 2 (vacant) | en plus | Phase 3 : « la dernière personne qui a écrit » |
| `POST /contrats/search` | Mon logement (Lucas, Grâce) | en plus | Phase 4 : `getByBien`, le bail en attente apparaît dans « À signer » |
| `GET /users/biens/:id` | `/quittances` (Lucas, Grâce) | en plus | Phase 4 : en-tête de Mon logement |
| `GET /juridictions/FR` et `/CD` | annonces 2 et 142 | en plus | Phase 5 : champs de l'annonce selon le pays |
| `GET /users/biens/:id` | annonce 2 vue par Claire | en plus | Phase 5 : `Annonce-Proprio` |
| `GET /quittances/:id/lien-whatsapp` | quittances du bien 141 | en moins au chargement | Phase 3 : « Rappel par WhatsApp » est dans la feuille des actions de la quittance ; le même GET part à son ouverture (vérifié par un test) |

**Valeurs affichées** (montants, dates, statuts lus dans le texte) sur l'accueil de Claire, les quittances de Claire
et de Patrick, Mon logement et les quittances de Lucas, les annonces 2 et 142 : tout ce que montrait la branche
d'origine se retrouve dans la refonte. Cette comparaison a révélé la date de début du bail disparue de Mon logement
(corrigé, voir § 4).

Normalisation à connaître : l'API renvoie certaines listes (lieux proches, équipements) dans un ordre variable ; les
tableaux sont donc ordonnés avant l'empreinte. L'ordre des résultats d'une recherche dépend du tri demandé, comparé
par le corps de la requête.

## 3. Conformité visuelle

### Aux maquettes (`conformite`, non bloquant)

Capture à la taille de la maquette (1440 px × hauteur du PNG ; 390 × 844 pour les téléphones, **découpés** dans les
planches à la position relevée dans leur HTML), masques sur photos, cartes, vidéo, dates et compteurs du jour.
Ratio = part des pixels dont la couleur s'écarte de plus de 30 % : il repère une dérive de mise en page (blocs
déplacés, manquants, en plus), pas les différences de texte fines. Seuil documenté : 35 %. Images de différence et
captures : `e2e/visuel/conformite/` (non commité), aussi jointes au rapport HTML de Playwright.

| Écran | Maquette | Pixels différents | Écarts restants et raison |
| --- | --- | --- | --- |
| O1v2-Landing | O1v2-Landing.png | 10,0 % | Bouton clair / sombre et section vidéo (gardés) ; « Lucas Bernard » ; étape 3 (E8) ; photos d'exemple |
| O1v2-Explorer | O1v2-Explorer.png | 2,6 % | Pas de Favoris ni d'alerte (E4, E5) ; filtres en feuille (F2) ; tri ; annonces réelles |
| Annonce-France | Annonce-France.png | 4,0 % | Mention de confidentialité validée ; GES aux couleurs du DPE (F3) |
| Annonce-RDC | Annonce-RDC.png | 4,5 % | Contenu de l'annonce de démo |
| Annonce-Proprio | Annonce-Proprio.png | 8,2 % | Barre latérale du propriétaire au lieu de la barre publique |
| Nav-Proprio-Tableau | Nav-Proprio-Tableau.png | 3,9 % | « Ajouter un bien » olive ; cloche avec nombre ; pas de « Répondre à … » (F1) |
| Nav-Proprio-Messages | Nav-Proprio-Messages.png | 3,1 % | Recherche par bien (E6) ; heure et accusé dans la bulle |
| Nav-Candidat | Nav-Candidat.png | 2,9 % | Pas de Favoris, d'alertes, de « Vous : » (E4, E5, E13) ; onglet Demandes |
| Fiche-Bien-Loue | Fiche-Bien-Loue.png | 2,5 % | Frise à 4 étapes visibles ; carte en lecture seule |
| Fiche-Bien-Vacant | Fiche-Bien-Vacant.png | 2,6 % | Pas de « retiré des annonces » (E8) |
| Assist-Bail | Assist-Bail.png | 3,3 % | Pas de brouillon ; avertissement du dépôt (E7) ; aperçu sans texte complet (E2) |
| Bail-A-Signer | Bail-A-Signer.png | 7,8 % | Titre = titre du bien ; bail de démo de Grâce (RDC) |
| Assist-EDL | Assist-EDL.png | 4,0 % | Bloc photos absent (E1) ; pas de « vérifiée » |
| Mon-Logement | Mon-Logement.png | 2,8 % | Logement de Grâce (bail à signer) ; WhatsApp en lien `wa.me` |
| Mon-Logement-Quittances | Mon-Logement-Quittances.png | 2,1 % | Badges et colonne Détail existants |
| Mon-Logement-Reserve | Mon-Logement-Reserve.png | 3,2 % | Icône, adresse au lieu du loyer, pas de « Message » (E10, E8) |
| Signer-Bail | Signer-Bail.png | 12,1 % | Titre = adresse (E11), aperçu (E2), « Signé par … » (E3), cadre de signature blanc |
| Signer-Lien-Invalide | Signer-Lien-Invalide.png | 1,4 % | La planche montre deux cartes (410 et 404), l'écran une seule |
| Nav-Mobile (propriétaire) | Nav-Mobile.png, découpe | 12,8 % | Contenu de l'accueil ; barre d'état simulée de la maquette (~32 px) |
| Nav-Mobile (locataire) | Nav-Mobile.png, découpe | 17,5 % | Arrivée sur Mon logement (planche `Nav-Locataire` retirée) |
| Nav-Mobile (candidat) | Nav-Mobile.png, découpe | 14,4 % | Pas de Favoris (E4) ; onglet Demandes |
| Assist-EDL-Mobile (liste) | Assist-EDL-Mobile.png, découpe | 7,3 % | Pas de « vérifiée » |
| Assist-EDL-Mobile (pièce) | Assist-EDL-Mobile.png, découpe | 14,6 % | Bloc photos absent (E1) |
| Signer-Mobile (relire) | Signer-Mobile.png, découpe | 11,1 % | Titre = adresse (E11) |
| Signer-Mobile (signer) | Signer-Mobile.png, découpe | 19,2 % | Panneau de signature plus haut ; consigne « souris ou doigt » |
| Signer-Mobile (confirmation) | Signer-Mobile.png, découpe | 12,3 % | Pas de « Télécharger le PDF » (E12) |

Le découpage des planches de téléphones s'est révélé fiable (coordonnées tirées du HTML, vérifiées à l'œil) : pas
besoin de planche côte à côte. Seul `Nav-Mobile.dc.html` ne s'affiche pas en local (gabarit non exécuté) : ses
coordonnées viennent de la position commune des téléphones des autres planches, contrôlée sur le PNG.

### Non-régression visuelle (`ordinateur`, `telephone`, bloquant)

50 instantanés dans `e2e/visuel/instantanes/` : les 18 écrans sur ordinateur et téléphone, les 8 écrans propres au
téléphone, et en sombre l'accueil propriétaire, Mon logement et la signature. Référence = rendu actuel validé, seuil
1 % de pixels. Les données sont datées (mois courant, échéances) : régénérer avec `--update-snapshots` après un
changement voulu ou au changement de mois.

## 4. Bugs trouvés

| Bug | Où | Suite |
| --- | --- | --- |
| Explorer : une réponse de recherche arrivée en retard remplaçait la plus récente (« 19 annonces » affichées pour une adresse qui en donne 7). Antérieur à la refonte | `explorer.component.ts` | **Corrigé** : `fix(vitrine): Explorer garde les résultats de la dernière recherche` (recherche précédente annulée, mêmes appels) |
| Mon logement : la date de début (et de fin) du bail signé, affichée avant la refonte, avait disparu | `mon-logement.component.*` | **Corrigé** : `fix(locataire): début et fin du bail sur Mon logement` (même tableau de bord, aucun appel) |
| Retour du navigateur dans l'assistant d'état des lieux sans confirmation | route de l'assistant | **Fait** (décision) : `feat(edl): …` |
| **Même défaut** dans les assistants de bail (`/biens/:id/bail/nouveau`), de nouveau bien (`/biens/nouveau`) et de quittance (`/biens/:id/quittances/nouvelle`) : aucun `canDeactivate` | `app.routes.ts` | **Non modifié** (consigne) ; la garde `sortieAssistantGuard` est générique : il suffit d'implémenter `peutQuitter()` |
| « Créer le bail **de Inès** Moreau » (élision) | fiche d'un bien réservé | Non corrigé (texte), à faire : « d'Inès » |
| « Claire Martin sera **prévenu** » (accord), fenêtre « Se désister » et « Fin de location » | locataire | Non corrigé ; tournure neutre à choisir |
| Conversation neuve depuis Mon logement : l'interlocuteur s'affiche « claire.martin » (partie locale de l'e-mail) tant qu'aucun message n'existe | messagerie | Non corrigé (comportement existant, le nom n'est pas connu sans conversation) |
| Fiche d'un bien **réservé** : « Proposer » reste proposé dans la conversation | messagerie | Non corrigé ; la règle du bouton ne tient compte que du locataire et de l'archivage |
| Garde de sortie : après « Continuer la saisie », l'entrée d'historique précédente est remplacée par l'adresse de l'assistant (`canceledNavigationResolution: 'replace'`, réglage par défaut d'Angular). Un second retour redemande confirmation, mais saute une page | routeur | À décider : `'computed'` corrigerait l'historique, réglage global du routeur |

## 5. Données de démo

### Suite sur données réelles (accord du 7 novembre 2026)

Par l'interface, donc par les mêmes appels que le front :

1. Claire propose le bien 2 à Inès (`/biens/2/locataire`) : `POST /biens/2/demandes-location/5` → 201.
2. Accueil d'Inès : « Demande de location à traiter · Claire M. vous propose la location d'Appartement T3 avec
   parking, Brotteaux · Répondez avant le 10 novembre à 20 h 30 » (vérifié sans cliquer).
3. Inès accepte (`/demandes-location`) : `POST /demandes-location/1/accepter` → 200.
4. Logement réservé d'Inès (accueil et Mon logement) : « Réservé jusqu'au 21 novembre · J-14 · il reste 14 jours »,
   frise Demande acceptée → Quittances ; fiche du bien 2 chez Claire : « Réservé · bail à créer », « Créer le bail de
   Inès Moreau ».
5. Fin : Inès se désiste (`POST /locations/31/desister` → 200) : bien 2 « Vacant · annonce en ligne », Inès redevient
   candidate.

Notifications créées : `DEMANDE_LOCATION` (Inès), `DEMANDE_LOCATION_ACCEPTEE` et `RESERVATION_DESISTEE` (Claire) ;
2 e-mails dans Mailpit.

### État final de la base (contrôle en lecture seule, `kupanga_dev`)

Comptage et empreinte du contenu de 19 tables avant la phase et après :

| Table | Avant | Après | Cause |
| --- | --- | --- | --- |
| biens, images, équipements, lieux, contrats, états des lieux (pièces, éléments, compteurs, clés), quittances, documents, utilisateurs | — | **identiques** (contenu compris) | — |
| `demandes_location` | 0 | 1 (`ACCEPTEE`) | Suite réelle autorisée |
| `locations` | 30 | 31 (n° 31, `DESISTEE`) | Suite réelle autorisée |
| `notifications` | 9 | 12 | Suite réelle (3 notifications) |
| `emails_sortants` | 9 | 11 | Suite réelle (2 e-mails) |
| `messages` | 66 | **67** | **Fuite d'un message de test**, voir ci-dessous |
| `conversations` | 33 | 33 (contenu modifié) | Dernier message de la conversation Claire ↔ Inès |

Les 66 messages d'origine sont strictement identiques (contenu et état lu) : **aucune conversation n'a été marquée
comme lue**, les tests répondent eux-mêmes à « marquer comme lu ».

**Incident : un message de test a atteint la base.** Message n° 67, « Message de test e2e (intercepté) », de Claire à
Inès sur le bien 2, le 7 novembre à 20:52, pendant la mise au point du test de messagerie sur téléphone. SockJS
s'était rabattu sur un transport (`jsonp_send`, corps encodé `d=…`) que la première version de l'interception ne
décodait pas. Corrigé dans le même commit que le test (tous les transports `*_send`, corps décodé, WebSocket compris),
vérifié en forçant le repli XHR et sur une dizaine d'exécutions sans nouvelle fuite. Je ne l'ai pas supprimé : la
consigne interdit d'écrire en base et l'API n'a pas de suppression de message. Il apparaît comme dernier message de
la conversation Claire ↔ Inès, donc aussi dans `reference.json` et les instantanés de la messagerie. **Décidé le
8 novembre 2026** : Gédéon le garde (test manuel de sa part) ; référence réenregistrée sur cet état, sans écart.

Autre écart de méthode : un de mes scripts de diagnostic (hors tests, sans garde-fou) a appelé une fois
`POST /messages/conversation/claire.martin@kupanga.dev/lire?bienId=1` pour Lucas. Lucas n'ayant aucune conversation
avec Claire, rien n'a changé (empreinte des messages identique).

## 6. Écarts restants de toute la refonte

Repris des bilans des phases 1 à 5 (détail dans `00-vue-ensemble.md`), toujours valables :

- **Navigation** : cloche avec nombre de non-lues ; recherche de conversations par bien (E6) ; heure et accusé dans la
  bulle ; « Non lues » compte les messages ; pas de Favoris (E4) ; en-tête téléphone masqué quand il est vide.
- **Propriétaire** : « Ajouter un bien » olive ; pas de tâches « Répondre à … » ni « Créer la quittance du mois »
  (F1) ; frise à 4 étapes visibles et libellés communs ; pas de « retiré des annonces » (E8) ; précision d'état sur la
  vue d'ensemble seulement ; carte en lecture seule ; « Mettre fin au bail » en bouton ; pas de brouillon de bail ;
  avertissement du dépôt sans plafond légal (E7) ; aperçu sans texte complet (E2) ; pas de photos d'EDL (E1) ; tableau
  des quittances avec Échéance et Paiement, actions dans « … ».
- **Locataire et signature** : pas de « Modifier » ; WhatsApp en `wa.me` ; « Lire et signer » seulement si la
  notification est non lue (E9) ; badges de quittances existants ; réservation sans photo, loyer ni message (E10) ;
  titre = adresse et pas de type de bail (E11) ; « Signé par … le … » (E3) ; cadre de signature blanc ; pas de PDF
  après signature (E12) ; liens invalides en icônes Lucide, écran 409 ajouté.
- **Vitrine** : bouton de thème et vidéo sur la landing ; étape 3 reformulée (E8) ; filtres d'Explorer en feuille
  (F2) ; tri gardé ; GES aux couleurs du DPE (F3) ; barre latérale sur l'annonce du propriétaire.
- **Phase 6** : la garde de sortie n'existe que sur l'assistant d'état des lieux (voir § 4).

## 7. Évolutions

### Serveur (non construites)

| # | Évolution |
| --- | --- |
| E1 | Photos de l'état des lieux |
| E2 | Texte complet du bail dans l'API |
| E3 | Image de la signature du bailleur |
| E4 | Favoris |
| E5 | Alertes de recherche |
| E6 | Recherche des conversations par personne |
| E7 | Plafonds légaux du dépôt de garantie par juridiction |
| E8 | Bien réservé retiré de la recherche publique |
| E9 | Lien de signature lisible par le locataire connecté |
| E10 | Photo, loyer et e-mail du propriétaire dans la réservation |
| E11 | Titre du bien et type de bail dans le contrat et l'EDL lus par le jeton |
| E12 | PDF signé téléchargeable depuis la confirmation |
| E13 | Auteur du dernier message d'une conversation |

Aucune nouvelle évolution serveur en phase 6. Constat sur l'API, sans changement demandé : certaines listes (lieux
proches, équipements) changent d'ordre d'un appel à l'autre.

### Front (non construites)

F1 (règles de tâches de l'accueil), F2 (filtres d'Explorer en menus), F3 (couleurs GES), plus **F4** : garde de sortie
sur les assistants de bail, de nouveau bien et de quittance (même défaut que celui de l'EDL, corrigé par la même garde).

## 8. Points à décider

1. ~~Message de test n° 67~~ : **gardé** (décision du 8 novembre 2026), référence réenregistrée.
2. **Garde de sortie** sur les trois autres assistants (F4) et réglage `canceledNavigationResolution: 'computed'`.
3. **E2e dans la CI** : non ajoutés (ils demandent l'API, la base de démo et Edge). Possible avec un job qui lance
   `docker compose -f docker-compose-dev.yml up` ; les instantanés devront alors être générés sur la même machine
   (rendu des polices).
4. **Vidéo de la landing** : gardée (décision de la phase 5) ; elle reste chargée au clic seulement, les tests
   bloquent YouTube.
5. **Entrée « Demandes de location »** : ajoutée pour le candidat (décision de la phase 5), absente de la barre du
   propriétaire. Rien de nouveau ; les tests la couvrent.
6. **`design-system.yml`** : réécrit en phase 5, renvoie à `_theme.scss` et à la table des jetons. À garder ou retirer
   si personne ne le lit.
7. **Textes** : « de Inès », « sera prévenu », nom « claire.martin » dans une conversation neuve, « Proposer » sur un
   bien réservé (§ 4).
8. **Paquet initial** à 512,5 ko (seuil 500 ko) : avertissement accepté jusqu'ici.
9. **Instantanés datés** : à régénérer chaque mois tant qu'ils reposent sur la base de démo vivante ; une base figée
   (dump) les rendrait permanents.
10. **Limite de connexion de l'API** (20 par IP et par 15 min) : sans conséquence pour les tests grâce aux états de
    session, mais à connaître pour un environnement de CI partagé.

## 9. Commits de la phase 6

```
build(e2e): ajout de Playwright avec Edge
test(e2e): outils de connexion, journal des appels API et réponses simulées
feat(edl): confirmation avant de quitter l'assistant par le retour du navigateur
test(e2e): attente du réseau sans networkidle
fix(vitrine): Explorer garde les résultats de la dernière recherche
test(e2e): parcours visiteur
test(e2e): parcours propriétaire
test(e2e): parcours locataire
test(e2e): parcours candidat
test(e2e): signature par lien (valide, expiré, inconnu, déjà signé)
test(e2e): thème, clavier, toasts et hors ligne
test(e2e): messagerie, envoi après le chargement de l'historique
fix(locataire): début et fin du bail sur Mon logement
test(e2e): non-régression des appels API par rapport à la branche d'origine
test(e2e): lien d'état des lieux inconnu, attente de la réponse 404
test(e2e): conformité visuelle aux maquettes et instantanés de référence
docs(e2e): lancer les tests e2e et lire les rapports
test(e2e): filtres d'Explorer relevés après la dernière recherche
docs(refonte): rapport final de la refonte
```

Le worktree `../kupanga-front-reference` (avec sa jonction `node_modules`) est laissé en place pour réenregistrer la
référence ; il n'est pas commité. Le supprimer : `cmd /c rmdir ..\kupanga-front-reference\node_modules` puis
`git worktree remove ../kupanga-front-reference`.
