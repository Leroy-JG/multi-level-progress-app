# Confidentialité — Alam

**Vos données n'existent que sur votre appareil.** Alam n'a ni compte, ni serveur, ni statistiques d'usage :
l'application n'envoie rien sur Internet. Vous êtes le seul à détenir vos projets.

## Ce qui est stocké, et où

Vos projets, sous-projets, tâches, sous-tâches, notes, dates, rappels et réglages.

| Version | Emplacement |
|---|---|
| Android (APK) | base SQLite dans l'espace privé de l'application (inaccessible aux autres applications) |
| Web / PWA (Android, iPhone) | stockage du navigateur (`localStorage`) |

## Ce qui n'arrive jamais

- Aucune donnée envoyée à qui que ce soit : ni au développeur, ni à GitHub, ni à un service tiers.
- Aucun outil de mesure d'audience, de rapport de plantage, de publicité ou de suivi.
- Aucune mise à jour du code à distance (l'APK et la PWA ne changent que quand vous installez / rechargez une nouvelle version).
- Aucun compte, aucune synchronisation.

## Comment c'est garanti (et vérifiable)

| Cible | Verrou technique | Contrôle automatique |
|---|---|---|
| APK Android | La permission `INTERNET` est **retirée** du manifeste (`android.blockedPermissions`) : l'application n'a matériellement pas le droit d'ouvrir une connexion. La sauvegarde automatique Google est désactivée (`android.allowBackup: false`) : ni cloud Google, ni transfert entre téléphones. Permissions restantes : uniquement celles des rappels locaux (notifications, vibration, reprogrammation après redémarrage du téléphone). | Le workflow « APK Android » contrôle le manifeste généré, puis l'APK final (`aapt2`) : le build échoue si `INTERNET` réapparaît ou si la sauvegarde Android est réactivée. |
| PWA | Politique de sécurité du navigateur `connect-src 'none'` (`public/index.html`) : la page ne peut ouvrir **aucune** connexion (fetch, XHR, WebSocket, beacon). Aucune ressource externe (police, script, image) : tout vient du site lui-même. | Le workflow « Déployer le site » vérifie la politique dans la page publiée. |
| Code et dépendances | Aucun appel réseau dans `src/` et `app/`, aucun paquet de mesure d'audience / réseau / mise à jour à distance. | `src/privacy.test.ts` (lancé par `npm test`, donc à chaque build) : il échoue si l'un de ces verrous saute. |

Le code est ouvert : vous pouvez tout relire dans ce dépôt.

## Ce que cela ne couvre pas

- **Chargement de la PWA.** Comme pour tout site, quand vous ouvrez la PWA en ligne, GitHub Pages voit votre adresse IP et
  la demande des fichiers de l'application (le navigateur vérifie s'il existe une nouvelle version). Aucune de vos données
  n'est jointe. L'APK, lui, ne contacte personne une fois installé.
- **Sauvegardes de votre téléphone.** Alam s'exclut de la sauvegarde Android. Les sauvegardes complètes de votre téléphone
  (iCloud, ordinateur…) dépendent des réglages de votre téléphone : Alam ne peut pas les contrôler.
- **Pas de chiffrement.** Les données sont lisibles par quiconque a accès à votre téléphone déverrouillé ou à un fichier de
  sauvegarde. Protégez votre téléphone (verrouillage d'écran) et gardez vos sauvegardes en lieu sûr.
- **Vos exports.** Quand vous exportez une sauvegarde, c'est vous qui choisissez sa destination (fichier, e-mail, cloud…).
  À partir de là, elle vit là où vous l'avez envoyée.

## La contrepartie : personne d'autre n'a de copie

- Désinstaller Alam, effacer les données du site, ou perdre le téléphone **supprime vos données** — sauf si vous avez exporté une sauvegarde.
- **Exportez régulièrement** : Réglages → « Exporter une sauvegarde » (fichier JSON). L'écran affiche la date de la dernière
  sauvegarde et vous alerte après 30 jours.
- **Nouvel appareil, réinstallation** : « Restaurer une sauvegarde » depuis l'écran d'accueil, ou Réglages → « Importer une sauvegarde ».
- **Web / iPhone** : Safari peut vider le stockage d'un site non installé après ~7 jours sans visite. Ajoutez Alam à l'écran
  d'accueil, et utilisez « Protéger le stockage » dans les Réglages quand il est proposé.
- **Tout effacer** : Réglages → « Effacer toutes mes données ». Sur Android, la base est réécrite pour qu'aucune trace des
  anciennes données ne reste dans le fichier.

## Modifier ces garanties

Ne pas les affaiblir sans le dire. Ajouter un service réseau (synchronisation, statistiques, mise à jour à distance…)
suppose de changer la CSP, la permission Android et `src/privacy.test.ts` : ces changements doivent être explicites, et
cette page doit être mise à jour en conséquence.
