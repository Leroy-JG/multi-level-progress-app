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
| APK Android | La permission `INTERNET` est **retirée** du manifeste (`android.blockedPermissions`) : l'application n'a matériellement pas le droit d'ouvrir une connexion. La sauvegarde automatique Google est désactivée (`android.allowBackup: false`) : ni cloud Google, ni transfert entre téléphones. Les autres permissions déclarées sont détaillées ci-dessous : aucune ne donne accès à Internet. | Le workflow « APK Android » contrôle le manifeste généré, puis l'APK final (`aapt2`) : le build échoue si `INTERNET` réapparaît, si une permission inattendue apparaît ou si la sauvegarde Android est réactivée. |
| PWA | Politique de sécurité du navigateur `connect-src 'none'` (`public/index.html`) : la page ne peut ouvrir **aucune** connexion (fetch, XHR, WebSocket, beacon). Aucune ressource externe (police, script, image) : tout vient du site lui-même. | Le workflow « Déployer le site » vérifie la politique dans la page publiée. |
| Code et dépendances | Aucun appel réseau dans `src/` et `app/`, aucun paquet de mesure d'audience / réseau / mise à jour à distance. | `src/privacy.test.ts` (lancé par `npm test`, donc à chaque build) : il échoue si l'un de ces verrous saute. |

Le code est ouvert : vous pouvez tout relire dans ce dépôt.

### Permissions réellement déclarées par l'APK

Depuis la 2.2.1, l'APK ne déclare plus que **6** permissions. Liste relevée par `aapt2 dump permissions` sur l'APK 2.2.1 construit par
GitHub Actions (le build l'affiche à chaque fois, dans l'étape « Vérifier l'APK (confidentialité) ») :

| Permission | À quoi elle sert | Donne accès à Internet ? |
|---|---|---|
| `POST_NOTIFICATIONS`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED` | afficher vos rappels, faire vibrer, reprogrammer les rappels après un redémarrage du téléphone | non |
| `WAKE_LOCK` | déclarée par une dépendance de la bibliothèque de notifications ; permet de garder brièvement le processeur éveillé | non |
| `ACCESS_NETWORK_STATE` | déclarée par une dépendance de la bibliothèque de notifications ; permet seulement de lire si le téléphone est connecté, elle n'autorise **aucune** connexion | non |
| `com.alam.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | permission interne à Alam (sécurise ses propres échanges entre composants) | non |

**Retirées en 2.2.1** (la bibliothèque de notifications et ses dépendances les déclarent, mais Alam n'en a pas l'usage) :
la réception de notifications « push » Google (`com.google.android.c2dm.permission.RECEIVE`), la lecture du référent d'installation
Google Play, et les 16 permissions de pastille d'icône propres à certains lanceurs (Samsung, HTC, Sony, Huawei, Oppo…). Conséquence
assumée : Alam n'affiche pas de compteur sur son icône (il n'en affichait pas non plus avant). Ces permissions ne servent pas aux rappels
locaux ; le fonctionnement des rappels sur un téléphone réel n'a toutefois pas encore été confirmé par un test sur appareil.

Ce qui compte pour la garantie est ce qui **manque** : sans `android.permission.INTERNET`, Android interdit à l'application
d'ouvrir la moindre connexion réseau. Le build échoue si cette permission réapparaît, **et aussi si l'APK déclare la moindre
permission absente de la liste ci-dessus** (une nouvelle dépendance ne peut donc pas en ajouter une en silence).

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

## Sauvegardes automatiques (facultatives)

Réglages → « Sauvegardes automatiques ». **Désactivées par défaut** : rien n'est copié tant que vous ne l'avez pas décidé.
Une fois activées, Alam garde des copies de vos projets à l'ouverture de l'application, dès que le délai choisi est écoulé
(une semaine par défaut ; vous réglez le nombre de jours ou de semaines).

- Chaque copie **s'ajoute** à l'historique : la précédente n'est jamais écrasée. Seules les plus anciennes, au-delà du
  nombre de copies à garder (10 par défaut), sont supprimées. Une copie identique à la précédente n'est pas empilée.
- Les copies sont **légères** (JSON compact, sans mise en forme) et restent **sur l'appareil**, dans le même espace privé que
  vos données (table SQLite sur Android, IndexedDB du navigateur sur le web). Rien n'est envoyé nulle part.
- Elles ne sont **pas chiffrées**, comme vos données, et « Effacer toutes mes données » les supprime aussi.
- **Elles protègent d'une erreur** (suppression, mauvais import, mauvaise manipulation), **pas de la perte du téléphone,
  d'une désinstallation ou d'un stockage vidé** : elles disparaissent alors avec le reste. Pour cela, exportez un fichier
  (Réglages, ou depuis l'historique) et gardez-le ailleurs.
- Depuis l'historique, vous pouvez restaurer une copie (l'état actuel est d'abord ajouté à l'historique, pour pouvoir revenir
  en arrière), l'exporter dans un fichier ou la supprimer.
- Il n'y a pas de tâche de fond : une copie n'a lieu que quand vous ouvrez (ou rouvrez) l'application.

## La contrepartie : personne d'autre n'a de copie

- Désinstaller Alam, effacer les données du site, ou perdre le téléphone **supprime vos données** — sauf si vous avez exporté une sauvegarde.
- **Exportez régulièrement** : Réglages → « Exporter une sauvegarde » (fichier JSON). L'écran affiche la date de la dernière
  sauvegarde et vous alerte après 30 jours.
- **Nouvel appareil, réinstallation** : « Restaurer une sauvegarde » depuis l'écran d'accueil, ou Réglages → « Importer une sauvegarde ».
- **Web / iPhone** : Safari peut vider le stockage d'un site non installé après ~7 jours sans visite. Ajoutez Alam à l'écran
  d'accueil, et utilisez « Protéger le stockage » dans les Réglages quand il est proposé.
- **Tout effacer** : Réglages → « Effacer toutes mes données » (projets, réglages et copies automatiques). Sur Android, la base
  est réécrite pour qu'aucune trace des anciennes données ne reste dans le fichier.

## Modifier ces garanties

Ne pas les affaiblir sans le dire. Ajouter un service réseau (synchronisation, statistiques, mise à jour à distance…)
suppose de changer la CSP, la permission Android et `src/privacy.test.ts` : ces changements doivent être explicites, et
cette page doit être mise à jour en conséquence.
