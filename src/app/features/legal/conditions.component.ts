import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EDITEUR, LIENS_LEGAUX } from '../../core/legal/liens-legaux';
import { PageLegaleComponent } from './page-legale.component';
import { ChampEditeurComponent } from './champ-editeur.component';

/** Conditions d'utilisation (route publique `/conditions`). */
@Component({
  selector: 'kp-conditions',
  standalone: true,
  imports: [RouterLink, PageLegaleComponent, ChampEditeurComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <kp-page-legale titre="Conditions d'utilisation de Kupanga">
      <h2>1. Objet</h2>
      <p>
        Kupanga (<kp-champ-editeur [valeur]="editeur.nom" />, <kp-champ-editeur [valeur]="editeur.adresse" />)
        propose une application de gestion locative : publication d'annonces, messagerie entre propriétaires et
        candidats, demandes de location, baux, états des lieux et quittances signés en ligne, suivi des paiements
        déclarés. En créant un compte, vous acceptez ces conditions.
      </p>

      <h2>2. Compte</h2>
      <ul>
        <li>Vous devez fournir des informations exactes et confirmer votre adresse e-mail (ou vous connecter avec Google).</li>
        <li>Votre compte est personnel. Vous êtes responsable de la confidentialité de votre mot de passe.</li>
        <li>Un même compte peut être propriétaire de ses biens et locataire d'un autre logement.</li>
      </ul>

      <h2>3. Ce que fait Kupanga, et ce qu'il ne fait pas</h2>
      <ul>
        <li>
          <strong>Aucun paiement ne transite par Kupanga.</strong> Les loyers, dépôts et garanties sont réglés
          directement entre les parties ; Kupanga ne fait qu'enregistrer ce que le propriétaire déclare avoir reçu.
        </li>
        <li>
          Kupanga n'est ni agent immobilier, ni intermédiaire, ni partie aux baux. Le propriétaire et le locataire
          sont seuls responsables du contenu de leurs annonces, de leurs accords et du respect de la loi applicable
          au logement.
        </li>
        <li>
          Les modèles de documents sont fournis à titre d'aide. <strong>Les modèles pour la République démocratique
          du Congo sont provisoires</strong> et n'ont pas encore été validés par un juriste : faites relire vos
          documents si nécessaire.
        </li>
      </ul>

      <h2>4. Règles d'usage</h2>
      <p>Il est interdit :</p>
      <ul>
        <li>de publier une annonce fausse, trompeuse ou pour un bien dont vous n'avez pas le droit de disposer ;</li>
        <li>d'envoyer des messages abusifs, du harcèlement, du spam ou de collecter les coordonnées d'autres utilisateurs ;</li>
        <li>d'envoyer des fichiers illicites ou qui ne vous appartiennent pas ;</li>
        <li>de tenter de contourner la sécurité du service ou d'en perturber le fonctionnement.</li>
      </ul>
      <p>Nous pouvons retirer un contenu, archiver une annonce ou suspendre un compte qui ne respecte pas ces règles.</p>

      <h2>5. Contenus que vous publiez</h2>
      <p>
        Vous restez propriétaire de vos photos, textes et documents. Vous autorisez Kupanga à les héberger et à les
        afficher aux utilisateurs concernés, uniquement pour faire fonctionner le service.
      </p>

      <h2>6. Signature en ligne</h2>
      <p>
        Les signatures apposées dans Kupanga sont des signatures manuscrites dessinées à l'écran, enregistrées dans
        le document PDF. Un document signé ne peut plus être modifié.
      </p>

      <h2>7. Disponibilité et responsabilité</h2>
      <p>
        Le service est fourni en l'état. Nous faisons notre possible pour qu'il soit disponible et que vos données
        soient sauvegardées, sans pouvoir garantir une absence totale d'interruption. Kupanga ne peut être tenu
        responsable des litiges entre propriétaires et locataires.
      </p>

      <h2>8. Fin d'utilisation</h2>
      <p>
        Vous pouvez demander la suppression de votre compte à tout moment en écrivant à
        <kp-champ-editeur [valeur]="editeur.contact" [email]="true" />. Les documents signés avec une autre personne
        sont conservés sous forme anonymisée (voir la <a [routerLink]="liens.confidentialite">politique de confidentialité</a>).
      </p>

      <h2>9. Données personnelles</h2>
      <p>Leur traitement est décrit dans la <a [routerLink]="liens.confidentialite">politique de confidentialité</a>.</p>

      <h2>10. Modifications et droit applicable</h2>
      <p>
        Nous pouvons modifier ces conditions ; la date de mise à jour figure en haut de la page.
        <kp-champ-editeur [valeur]="editeur.droitApplicable" />
      </p>
    </kp-page-legale>
  `,
})
export class ConditionsComponent {
  protected readonly editeur = EDITEUR;
  protected readonly liens = LIENS_LEGAUX;
}
