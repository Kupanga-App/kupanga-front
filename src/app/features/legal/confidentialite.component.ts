import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EDITEUR } from '../../core/legal/liens-legaux';
import { PageLegaleComponent } from './page-legale.component';
import { ChampEditeurComponent } from './champ-editeur.component';

/** Politique de confidentialité (route publique `/confidentialite`, déclarée à Google pour l'écran de consentement). */
@Component({
  selector: 'kp-confidentialite',
  standalone: true,
  imports: [PageLegaleComponent, ChampEditeurComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <kp-page-legale titre="Politique de confidentialité de Kupanga">
      <p>
        Kupanga est une application de gestion locative qui met en relation des propriétaires et des locataires, en
        France et au Congo (RDC, Congo-Brazzaville). Cette page explique quelles données nous collectons, pourquoi,
        avec qui nous les partageons, combien de temps nous les gardons et comment exercer vos droits.
      </p>

      <h2>1. Responsable du traitement</h2>
      <ul>
        <li><strong>Éditeur</strong> : <kp-champ-editeur [valeur]="editeur.nom" /></li>
        <li><strong>Adresse</strong> : <kp-champ-editeur [valeur]="editeur.adresse" /></li>
        <li><strong>Contact pour vos données</strong> : <kp-champ-editeur [valeur]="editeur.contact" [email]="true" /></li>
      </ul>

      <h2>2. Données que nous collectons</h2>
      <div class="kp-legal__tableau">
        <table>
          <thead><tr><th scope="col">Catégorie</th><th scope="col">Données</th><th scope="col">Origine</th></tr></thead>
          <tbody>
            <tr>
              <td>Compte</td>
              <td>Prénom, nom, adresse e-mail, mot de passe (stocké chiffré, jamais en clair), photo de profil facultative,
                choix d'accueil (« trouver un logement » ou « mettre un bien en location »)</td>
              <td>Vous, à l'inscription</td>
            </tr>
            <tr>
              <td>Connexion avec Google</td>
              <td>Identifiant Google, adresse e-mail (et le fait qu'elle est confirmée par Google), prénom, nom, photo de profil</td>
              <td>Google, avec votre accord</td>
            </tr>
            <tr><td>Téléphone</td><td>Numéro de téléphone facultatif</td><td>Vous</td></tr>
            <tr>
              <td>Biens</td>
              <td>Adresse, position sur la carte, description, loyer, charges, dépôt de garantie, équipements, photos</td>
              <td>Le propriétaire</td>
            </tr>
            <tr>
              <td>Location</td>
              <td>Demandes de location, réservations, baux, états des lieux, quittances, signatures manuscrites,
                déclarations de paiement, photos de reçus, congés et fins de bail</td>
              <td>Le propriétaire et le locataire</td>
            </tr>
            <tr><td>Messagerie</td><td>Messages échangés au sujet d'un bien</td><td>Vous et votre interlocuteur</td></tr>
            <tr>
              <td>Données techniques</td>
              <td>Adresse IP (pour limiter les tentatives de connexion abusives), journaux d'erreurs</td>
              <td>Votre navigateur</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Nous ne collectons aucune donnée bancaire : <strong>aucun paiement ne passe par Kupanga</strong>.</p>

      <h2>3. Pourquoi nous utilisons ces données</h2>
      <div class="kp-legal__tableau">
        <table>
          <thead><tr><th scope="col">Finalité</th><th scope="col">Base légale</th></tr></thead>
          <tbody>
            <tr><td>Créer et sécuriser votre compte, vous connecter</td><td>Exécution du contrat (conditions d'utilisation)</td></tr>
            <tr>
              <td>Publier des annonces, gérer les locations, produire les baux, états des lieux et quittances</td>
              <td>Exécution du contrat</td>
            </tr>
            <tr>
              <td>Vous envoyer des e-mails liés au service (confirmation d'adresse, mot de passe oublié, invitation à signer,
                demandes de location, fin de bail)</td>
              <td>Exécution du contrat</td>
            </tr>
            <tr>
              <td>Prévenir les abus (limite de tentatives, contrôle des fichiers envoyés) et corriger les erreurs</td>
              <td>Intérêt légitime (sécurité du service)</td>
            </tr>
            <tr><td>Conserver les documents signés</td><td>Obligation légale et intérêt légitime (preuve)</td></tr>
          </tbody>
        </table>
      </div>
      <p>Nous n'utilisons pas vos données à des fins publicitaires, nous ne les vendons pas et nous ne faisons pas de profilage.</p>

      <h2>4. Données issues de votre compte Google</h2>
      <p>
        Si vous vous connectez avec Google, Kupanga reçoit uniquement votre identifiant Google, votre adresse e-mail,
        votre prénom, votre nom et votre photo de profil (autorisations <code>openid</code>, <code>email</code> et
        <code>profile</code>). Ces données servent <strong>seulement</strong> à créer votre compte et à vous connecter.
        Elles ne sont ni vendues, ni transférées à des tiers, ni utilisées pour de la publicité, ni utilisées pour
        entraîner des modèles d'intelligence artificielle.
      </p>
      <p>
        L'utilisation des informations reçues des API Google respecte la
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">politique
        relative aux données utilisateur des services d'API Google</a>, y compris les exigences d'utilisation limitée
        (<em>Limited Use</em>).
      </p>
      <p>
        Vous pouvez retirer à tout moment l'accès de Kupanga depuis
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">la page des autorisations
        de votre compte Google</a>.
      </p>

      <h2>5. Qui voit vos données</h2>
      <ul>
        <li>
          <strong>Les autres utilisateurs</strong>, seulement dans la mesure nécessaire :
          <ul>
            <li>l'annonce publique d'un bien montre son adresse, une position arrondie à environ 100 mètres, les photos et
              le prénom du propriétaire avec l'initiale de son nom ;</li>
            <li>le propriétaire et le locataire d'un même bien voient leurs noms, leur numéro de téléphone (s'il est
              renseigné) et leurs documents communs ;</li>
            <li>la personne à qui vous écrivez par la messagerie voit vos messages et votre adresse e-mail.</li>
          </ul>
        </li>
        <li>
          <strong>Nos prestataires techniques</strong>, qui agissent pour notre compte :
          <ul>
            <li>l'hébergeur du serveur et du stockage des fichiers (<kp-champ-editeur [valeur]="editeur.hebergeur" />) ;</li>
            <li>le service d'envoi des e-mails (Brevo, France) ;</li>
            <li>le service de suivi des erreurs (Sentry), sans adresse IP ni identité de l'utilisateur ;</li>
            <li>OpenStreetMap (cartes, recherche d'adresse, lieux à proximité) : votre navigateur charge les cartes depuis
              leurs serveurs, qui voient donc votre adresse IP ; l'adresse d'un bien leur est envoyée pour la placer sur la carte ;</li>
            <li>Google, si vous choisissez de vous connecter avec Google.</li>
          </ul>
        </li>
      </ul>
      <p>
        Les documents (baux, états des lieux, quittances, reçus) et les photos de profil sont stockés dans des espaces
        privés et ne sont accessibles que par des liens temporaires.
      </p>

      <h2>6. Durée de conservation</h2>
      <ul>
        <li>
          <strong>Compte</strong> : tant que vous l'utilisez. À la suppression, il est effacé s'il n'est lié à aucun bien
          ni document ; sinon il est <strong>anonymisé</strong> (nom, e-mail, téléphone, photo et accès Google effacés) et
          les documents signés sont conservés comme preuve pour l'autre partie.
        </li>
        <li><strong>Liens de confirmation, de réinitialisation et de signature</strong> : de 10 minutes à 72 heures.</li>
        <li><strong>File d'envoi des e-mails</strong> : contenu effacé après l'envoi, ligne supprimée après 90 jours.</li>
        <li><strong>Sauvegardes</strong> : 12 mois au plus.</li>
      </ul>

      <h2>7. Vos droits</h2>
      <p>
        Vous pouvez demander l'accès à vos données, leur rectification, leur effacement, leur portabilité, la limitation
        de leur traitement ou vous opposer à celui-ci, en écrivant à
        <kp-champ-editeur [valeur]="editeur.contact" [email]="true" />. Nous répondons dans un délai d'un mois.
      </p>
      <p>
        Si vous résidez dans l'Union européenne, vous pouvez aussi adresser une réclamation à la CNIL
        (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
      </p>

      <h2>8. Sécurité</h2>
      <p>
        Connexions chiffrées (HTTPS), mots de passe chiffrés, espaces de stockage privés pour les documents, limite des
        tentatives de connexion, contrôle des fichiers envoyés et suppression des métadonnées (dont la position GPS) des photos.
      </p>

      <h2>9. Modifications</h2>
      <p>
        Nous pouvons modifier cette politique. La date de mise à jour figure en haut de la page ; en cas de changement
        important, vous en serez informé dans l'application ou par e-mail.
      </p>
    </kp-page-legale>
  `,
})
export class ConfidentialiteComponent {
  protected readonly editeur = EDITEUR;
}
