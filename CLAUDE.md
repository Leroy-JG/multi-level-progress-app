# multi-level-progress-app — mémoire du projet

Ce fichier est lu automatiquement par Claude Code à chaque session. Il sert de mémoire : le tenir à jour
à chaque décision ou étape terminée.

## But
App mobile de suivi de progression de projets multi-niveaux. Nom affiché : **« Alam »** (renommé depuis « W »). Identifiants internes gardés tels quels : clé localStorage `w:data:v2`, format d’export `w-progress` (compatibilité des données).
Public : tout le monde, usage **solo, hors ligne, sans compte**. Android + iPhone.
**Principe directeur (décidé le 2026-09-30) : les données n'existent QUE sur l'appareil de l'utilisateur** — il en est le seul propriétaire, personne d'autre (développeur, GitHub, Google) n'en a de copie. Voir la section « Données uniquement locales » et `PRIVACY.md`.
Inspiration d'interface : « Study Tracker & Timer: Track It » (Android) mais **uniquement le suivi de projet**
(pas de chronomètre / suivi du temps).

## Décisions validées par l'utilisateur

### Techno
- Expo (React Native) + TypeScript `strict`, expo-router. Stockage local (SQLite sur mobile, web = navigateur).
- Logique métier en TypeScript pur dans `src/domain`, testée avec Vitest. UI et stockage = fines couches.
- **Langue** : français uniquement pour l'instant, mais prévoir un module i18n (dictionnaire + fonction `t()`)
  pour accueillir l'anglais plus tard. Aucun texte en dur dans les écrans à terme.

### Distribution (sans compte développeur)
- Pas de compte Google Play ni Apple Developer. L'app doit être téléchargeable depuis internet.
- Plan : **PWA** (app web installable, hors ligne, via « Ajouter à l'écran d'accueil ») hébergée sur GitHub Pages
  → marche sur Android ET iPhone. + **APK Android** construit par GitHub Actions et attaché à une release GitHub
  (installation manuelle). iPhone natif (IPA) impossible sans compte Apple payant → PWA.
- Conséquences : le web est une cible de première classe (stockage robuste, export/import JSON indispensable).
  Les rappels (notifications) sont fiables sur Android natif, limités sur iPhone/PWA.

### Hiérarchie et progression
- 4 niveaux : **Projet** (racine = 100 %) → **Sous-projet** → **Tâche** → **Sous-tâche** (feuille).
- Projets totalement distincts, sélecteur de projet en haut à gauche (créer / choisir / modifier / couleur).
- **Barre de progression à tous les niveaux.**
- Poids d'un élément dans son parent, à tous les niveaux : **1/N par défaut** ou **pourcentage fixé** (ex. 70/30).
  Mixte : les fixes prennent leur part, les « auto » se partagent le reste. Somme = 100 % toujours.
- Un nœud avec enfants : progression = somme pondérée des enfants. Une feuille : avancement 0–100 %.
- **Tout peut se cocher** ET **on peut saisir un avancement à la main** (feuille : 0–100 %).
  Cocher = 100 %, décocher = 0 %. Interprétation retenue (à confirmer) : sur un parent, cocher = tout terminer
  (toute la sous-arborescence à 100 %), décocher = tout remettre à 0 ; la saisie manuelle % se fait sur les feuilles,
  un parent affiche la valeur calculée.
- À 100 % : effet visuel (couleur `success`, coche).
- **Réordonner** les éléments : oui. **Déplacer** d'un parent à un autre : non.

### v2 : accordéons et clavier (validé par l'utilisateur)
- **Accordéons** dans la liste de chaque écran (projet, sous-projet, tâche) : chaque élément qui a des enfants a une
  flèche (▸/▾) à gauche ; en appuyant dessus on déploie son contenu sur place, à tous les niveaux
  (sous-projet → tâches → sous-tâches). Repliés par défaut ; l'état déplié est gardé pour la session (pas enregistré).
- Chaque ligne, à tous les niveaux : **case à cocher, nom, barre et pourcentage**. Appuyer sur le corps de la ligne
  (ou la chevron ›) ouvre l'écran de l'élément comme avant. Cocher un parent garde la confirmation « tout terminer ».
- Mode « Réordonner » : seuls les éléments du premier niveau sont affichés (accordéons repliés), avec leurs flèches.
- **Clavier** : le champ en cours de saisie doit toujours rester visible au-dessus du clavier (écrans et feuilles).

### Données uniquement locales (validé par l'utilisateur, 2026-09-30, v2.1.0)
- **Verrous techniques** : APK = permission `INTERNET` retirée (`android.blockedPermissions`, avec `SYSTEM_ALERT_WINDOW` et
  `READ/WRITE_EXTERNAL_STORAGE` inutiles) + `android.allowBackup: false` (ni cloud Google ni transfert : **remplace** l'ancien
  choix « sauvegarde automatique activée ») ; PWA = CSP `connect-src 'none'` dans `public/index.html`.
  Depuis la 2.2.1 : aussi les permissions FCM / install referrer / badges de lanceurs (voir « Sécurité »).
  Note : `expo-file-system` (dépendance d'Expo) déclare INTERNET → seul `blockedPermissions` (`tools:node="remove"`) l'enlève du manifeste fusionné.
- **Garde-fous** : `src/privacy.test.ts` (aucun appel réseau dans `src/`+`app/`, aucun paquet de télémétrie / réseau / mise à
  jour à distance, `allowBackup=false`, INTERNET bloqué, CSP sans hôte externe, service worker même-origine) ; workflow APK :
  contrôle du manifeste généré puis de l'APK final (`aapt2`) ; workflow Pages : `connect-src 'none'` dans `dist/index.html`.
  **Ajouter un service réseau exige de changer explicitement ces verrous ET `PRIVACY.md`.**
- **Propriété des données dans l'app** : carte « Vos données n'existent que sur cet appareil » (`src/ui/PrivacyCard.tsx`) ;
  date de dernière sauvegarde (`Settings.lastBackupAt`, alerte après 30 jours, `src/domain/backup.ts`) ; « Effacer toutes mes
  données » (`store.eraseAll` → `Persistence.eraseAll` : web = suppression des clés `w:data:v2` et `mlp:data:v1` ; Android =
  `DELETE` + `VACUUM` + `wal_checkpoint(TRUNCATE)`, car un simple `DELETE` laisse les textes dans le fichier — vérifié) ;
  stockage persistant web (`src/storage/durability.web.ts`, `navigator.storage.persist()` **sur geste de l'utilisateur
  seulement** : Firefox affiche une demande) ; bouton « Restaurer une sauvegarde » sur l'écran d'accueil vide (nouvel appareil).
- Exporter n'est comptabilisé comme sauvegarde que si l'utilisateur a réellement partagé (`shareText` renvoie `false` si la feuille de partage est fermée).
- Non fait (idées) : export chiffré par mot de passe, verrouillage de l'app, alerte visible si l'écriture locale échoue (quota / navigation privée).

### Sauvegardes automatiques facultatives (validé par l'utilisateur, 2026-09-30, v2.2.0)
- **Réglage à part, désactivé par défaut** (`Settings.autoBackup` : `enabled`, `every` + `unit` `days|weeks` — 1 semaine par défaut,
  bornes 1–365 j / 1–52 sem —, `keep` 5/10/20/50 (10 par défaut), `lastRunAt`). Écran `app/backups.tsx` → `src/ui/BackupsView.tsx`
  (interrupteur, fréquence, copies conservées, « Sauvegarder maintenant », historique), atteint depuis Réglages (ligne « Sauvegardes automatiques »).
- **Historique qui s'empile** : chaque copie s'ajoute, la précédente n'est jamais écrasée ; seules les plus anciennes, au-delà de `keep`,
  sont supprimées (à la copie suivante). Copies **légères** : export JSON compact (`exportData(..., compact)`), liste sans le contenu,
  copie identique à la dernière (`snapshotHash`, indépendante de l'ordre) non empilée. Types : `auto`, `manual`, `before-restore`.
- **Quand** : à l'ouverture de l'app et à chaque retour au premier plan (`AppState`), si `isBackupDue` ; **pas de tâche de fond**
  (l'UI le dit). Activer ⇒ première copie tout de suite si due. Le délai repart après une copie auto (même « inchangée »), jamais si rien à copier.
- **Stockage** (jamais hors appareil, non chiffré) : Android = table SQLite `backups` (créée par `CREATE TABLE IF NOT EXISTS`, pas de
  changement de `user_version`) ; web = **IndexedDB** `alam-backups` (pas localStorage : son quota partagé ne doit pas menacer les données).
  `Persistence` étend `BackupBackend` (`listBackups/readBackup/addBackup/deleteBackup`). « Effacer toutes mes données » supprime aussi les copies.
- **Restaurer** : `prepareRestore` (lit, valide avec `parseImport`, garde d'abord l'état actuel en `before-restore`) puis `replaceAll`.
- **Limite assumée et affichée** : les copies vivent dans le même espace que les données → elles protègent d'une erreur, **pas** de la perte
  du téléphone / désinstallation / stockage vidé (il faut exporter un fichier). Piste non faite : dossier choisi par l'utilisateur
  (Android SAF, `expo-file-system`) pour survivre à la désinstallation.
- **Fenêtre de proposition** (`src/ui/BackupPrompt.tsx`, montée dans `app/_layout.tsx`) : à la création du **tout premier projet**
  (aucune racine existante) si `!backupPromptSeen` et copies non activées ; bouton « Configurer les sauvegardes » → `/backups`, ou « Fermer ».
  `backupPromptSeen` est posé à l'affichage (ne revient jamais, sauf après « Effacer toutes mes données » qui remet les réglages à zéro).
  Pas de fenêtre pour les utilisateurs déjà équipés en projets (mise à jour depuis ≤ 2.1.0).
- Store : `updateSettings` (point d'entrée unique des réglages, `settingsRef`), `runSnapshot` (dans la file d'écriture, revérifie
  `isBackupDue` pour les copies auto), `replaceAllNodes` partagé par import et restauration. Logique testable dans `src/store/snapshots.ts`.

### Dates, notes, rappels, calendrier
- Notes libres sur chaque élément.
- Date limite (optionnelle) et rappel (optionnel) sur chaque élément.
- **Date de complétion enregistrée** dès qu'un élément est coché ou atteint 100 % (redevient vide s'il repasse < 100 %).
- **Vue calendrier** (par projet) : voir quels jours tel ou tel élément a été terminé (et échéances).
- **Statistiques par projet uniquement** (jamais tous les projets à la fois).
- **Export / import JSON** des données.

### Charte graphique
| Rôle | Couleur | | Rôle | Couleur |
|---|---|---|---|---|
| primary | `#26428B` | | background-light | `#F4EBD9` |
| primary-dark | `#1C1A17` | | background-dark | `#14213D` |
| secondary | `#2A9D9F` | | success | `#2F6B4F` |
| accent | `#C9A227` | | error | `#B5623B` |
| accent-warm | `#E8A317` | | neutral | `#8A7F6D` |

- `primary-dark` n'est **pas** le vrai primary : c'est une variante très sombre (quasi noir chaud) → texte / surfaces
  sombres, à utiliser à ma discrétion.
- **Police : Raleway** (Google Fonts, plusieurs graisses). L'utilisateur a écrit « Runaway » mais le lien fourni est
  https://fonts.google.com/specimen/Raleway. Paquet npm : `@expo-google-fonts/raleway`.
- **Thème** : clair, sombre et **automatique** (suit le téléphone) ; réglage persistant. Fond sombre = `#14213D`.
- **L'interface ne prend PAS la couleur du projet partout.** Le thème reste celui de la charte. La couleur du projet
  sert seulement à : bouton de sélection de projet (vraiment colorié), rappels/accents discrets, contours et
  écritures ponctuels.
- **Couleurs de projet proposées (12)** : kermes `#A3303F`, cornaline `#E07B39`, orpiment `#EBD27A`,
  olive `#7A8F3A`, turquoise `#2A9D9F`, ciel `#5B8FC7`, lapis `#26428B`, indigo `#4B3F8F`, pourpre `#7A3E8E`,
  rose-damas `#C9708A`, henne `#6B4A33`, pierre `#8A7F6D`.
- Icône : simple, à partir des couleurs de la charte (pas de logo fourni).

## Avancement
- [x] Cadrage, mémoire du projet
- [x] Expo 57 + TypeScript strict + Vitest ; domaine pur (arbre, poids, progression, mutations, insights, exchange)
- [x] Charte : thème clair/sombre/auto, Raleway, 12 couleurs de projet (bouton de projet colorié + accents discrets)
- [x] Modèle v2 : avancement manuel %, date de complétion, notes, échéance, rappel (migration SQLite v1→v2 en transaction)
- [x] Cocher partout (parent = confirmation « tout terminer »), réordonner (flèches), répartition %
- [x] Calendrier (par projet), statistiques (par projet), réglages, export/import JSON (validation stricte)
- [x] i18n : `src/i18n` (fr) prêt pour d'autres langues (ajouter `en.ts` + `LANGUAGES`)
- [x] 42 tests unitaires ; parcours complet testé dans Chromium (16 vérifications)
- [x] **v2** (2.0.0, `versionCode` 2) : accordéons récursifs + clavier qui ne masque plus les champs (voir ci-dessous)
- [x] **2.0.1** (`versionCode` 3) : nouvelle icône (arbre de barres de progression), aucun changement fonctionnel
- [x] **2.1.0** (`versionCode` 4) : données uniquement locales (voir section dédiée) — verrous, garde-fous, carte de confidentialité,
      date de dernière sauvegarde, effacement total, stockage persistant web, restauration depuis l'accueil, `PRIVACY.md`
- [x] **2.2.0** (`versionCode` 5) : sauvegardes automatiques facultatives + historique + proposition au premier projet (voir section dédiée)
- [x] **2.2.1** (`versionCode` 6, PR #13, commit `f06dee1`) : permissions superflues retirées (FCM, install referrer, badges de lanceurs) + liste blanche des permissions
      dans le workflow APK ; aucun changement fonctionnel (les rappels ne doivent pas changer : **non testé sur téléphone**). Build CI de la branche validé
      (run 36722846701 : `aapt2` = exactement 6 permissions, sans `INTERNET`, liste blanche passée, même signature de debug que la 2.2.0) ; l'APK à télécharger est
      l'artefact `Alam-apk` du dernier run réussi de « APK Android » sur `main`.
- [x] Relecture du français (2026-10-01) : accords « Nouvelle tâche / Ajouter une sous-tâche / Aucune tâche » (clés `level.<niveau>.create|modify|placeholder|add|empty` dans `fr.ts`, un texte par niveau pour gérer le genre ; ne plus composer `{name}` en minuscules), apostrophes typographiques, libellés des statistiques
- [ ] **Non testé sur téléphone** (SQLite natif jamais exécuté ici) → Expo Go. Idem pour le **clavier Android** de la v2 :
      la logique est testée dans Chromium (fenêtre réduite pour simuler le clavier) mais pas avec un vrai clavier Android
- [x] Rappels : notifications locales via `expo-notifications` (`src/notifications`), **code jamais exécuté sur un vrai
      téléphone** ; sur web/PWA les rappels sont enregistrés mais ne sonnent pas (l'UI le dit)
- [x] Icône = **arbre de barres de progression** (3 étages : 1 barre → 2 → 4, reliées par des connecteurs ; remplissage
      doré `#C9A227`, piste crème `#F4EBD9` translucide, sur `#26428B`) : la barre d'un parent est la moyenne de ses
      enfants, comme dans l'app. Remplace l'ancien « A » puis une barre seule dans un cadre (écartée). Favicon 48 px = version
      à 2 étages (plus lisible). Nom « Alam », splash. Générée par `scripts/make-icons.mjs`
- [x] PWA : `public/` (manifest, sw.js qui précache page + JS, icônes), testée hors ligne et sous sous-chemin GitHub Pages
- [x] Workflows : `.github/workflows/pages.yml` (site, sur push `main`) et `android-apk.yml` (APK, à la main ou tag `v*`)
      — **exécutés pour de bon le 2026-09-30** (PR #11 fusionnée, commit `b3816a2`) : site déployé, APK 2.2.0 construit en ≈ 25 min,
      artefact `Alam-apk` (`Alam.apk`, ≈ 53,7 Mo, conservé jusqu'au 2026-12-29 ; run 36714874936)
- [x] Branche fusionnée dans `main` ; le workflow « APK Android » a été lancé sur `main` (artefact `Alam-apk`)
- [ ] À faire par l'utilisateur : activer Pages si ce n'est pas fait (Réglages → Pages → Source : GitHub Actions) ;
      télécharger l'artefact : Actions → « APK Android » → dernier run réussi → `Alam-apk` (zip contenant `Alam.apk`)
- [ ] Test réel sur téléphone (Android via APK/Expo Go, iPhone via la PWA « Ajouter à l'écran d'accueil »)
- [ ] 2.2.0 — **jamais exécuté sur téléphone** : table SQLite `backups` (requêtes validées avec `node:sqlite` : création idempotente, purge, liste sans
      contenu, effacement + VACUUM sans reste), `Switch` / `AppState` / partage d'une copie sur Android. Testés ici : 91 tests unitaires, parcours web
      complet dans Chromium (59 vérifications : proposition au 1er projet, activation, période avec horloge simulée, empilement, copie identique,
      limite, export, restauration, suppression, effacement total, aucune requête externe / violation CSP) + l'ancien parcours (24)
- [x] Contrôles de confidentialité du workflow APK **validés sur le vrai CI** (runs 36714874936 puis 36722846701) : étape « Vérifier le manifeste généré » et
      étape « Vérifier l'APK (confidentialité) » (`aapt2`, y compris la liste blanche depuis la 2.2.1) passées ; l'APK final ne déclare **pas** `INTERNET`
      (voir `PRIVACY.md`, tableau des permissions)
- [ ] **Jamais exécuté sur téléphone** : `eraseAll` natif (SQL testé avec `node:sqlite`, pas avec expo-sqlite sur téléphone). Testés ici :
      manifeste généré par `expo prebuild` (INTERNET retiré, allowBackup=false), parcours web complet dans Chromium (24 vérifications :
      aucune requête externe, aucune violation CSP, hors ligne, export, effacement, restauration)
- [ ] Idées : glisser-déposer pour réordonner, langue anglaise (`src/i18n/en.ts`), sauvegarde plus robuste sur iPhone
      (Safari peut vider le stockage d'un site non installé après ~7 jours sans visite)

## Architecture (repères)
- `src/domain/*` : logique pure. `mutations.ts` renvoie de nouveaux tableaux en gardant la référence des nœuds
  inchangés ; le store (`src/store/store.tsx`) s'en sert pour ne sauvegarder que les différences, et appelle
  toujours `syncCompletion` (dates de complétion).
- `src/storage/persistence.ts` (SQLite) / `persistence.web.ts` (localStorage) : même interface `Persistence`.
- `src/domain/progress.ts` : `progressMap` calcule la progression de tout l'arbre en une passe (utilisé par les lignes
  d'accordéon) ; `tree.ts` : `groupByParent` (enfants triés de chaque parent en une passe).
- Accordéons : `src/ui/NodeTree.tsx` (`TreeBranch`, récursif, reçoit un `TreeContext` de l'écran) ;
  `src/ui/expansion.ts` (ensemble des accordéons ouverts, en mémoire, `useSyncExternalStore`).
- Clavier : `src/ui/keyboard.tsx` — `useKeyboardInset()` (hauteur occupée par le clavier ; Android : + barre de
  navigation) et `KeyboardScrollView` (fait défiler pour garder le champ actif visible, via `TextInput` de
  `components.tsx` qui prévient la zone défilante au focus). Le calcul pur est dans `src/ui/reveal.ts`.
- Feuilles (`Sheet` dans `components.tsx`) : **plus de `Modal` natif**. Elles sont affichées par `<SheetProvider>`
  (`src/ui/SheetHost.tsx`, dans `app/_layout.tsx`) dans la fenêtre principale, par-dessus la navigation.
- Sauvegardes automatiques : `src/domain/autobackup.ts` (réglages, `isBackupDue`, `snapshotHash`), `src/store/snapshots.ts` (`takeSnapshot`,
  `prepareRestore`), `src/storage/types.ts` (`BackupBackend`), `persistence(.web).ts`, `src/ui/BackupsView.tsx`, `BackupPrompt.tsx`.
- Confidentialité : `src/privacy.test.ts` (garde-fous), `src/domain/backup.ts` (`backupStatus`), `src/storage/durability(.web).ts`,
  `src/ui/PrivacyCard.tsx`, `PRIVACY.md`.
- Écrans : `app/index.tsx` (projet), `calendar`, `stats`, `settings`, `node/[id]`. Barre du bas maison
  (`BottomBar`), pas expo-router Tabs (en cours de dépréciation dans Expo 57).
- Web : la pile de navigation garde les écrans précédents dans le DOM → dans les tests Playwright, utiliser `.last()`.
- Tests Playwright : depuis la 2.2.0, la création du tout premier projet ouvre la fenêtre « Protéger vos projets ? » (≈ 350 ms après) → la fermer
  (`Fermer`, `.last()`) avant de continuer. Le serveur de test (`python3 -m http.server`) n'a pas de repli SPA : naviguer dans l'app, pas par URL.

## Notes techniques
- `npx expo install` échoue dans l'environnement cloud (proxy) : utiliser `npm install pkg@version` avec les
  versions de `node_modules/expo/bundledNativeModules.json`. Ne pas laisser npm prendre le `latest` de react-native.
- Icônes : générées avec Playwright (SVG rendu dans Chromium, capture PNG, `omitBackground` pour l'adaptive et le
  splash) ; pas de Pillow dans l'environnement. 8 fichiers à régénérer ensemble : `assets/{icon,adaptive-icon,
  splash-icon,favicon}.png` et `public/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png`. Zones de
  sécurité (mesurées sur le pixel le plus éloigné du centre) : adaptive Android = cercle de 66 % (motif à 78 %),
  maskable PWA = cercle de 80 % (motif à 95 %). Script : `node scripts/make-icons.mjs` (reproductible : relancé sans
  changement, il ne modifie aucun PNG) ; il faut le paquet `playwright` (déjà présent dans l'environnement cloud).
  Changer une icône PWA ⇒ incrémenter `CACHE` dans `public/sw.js` (les icônes sont servies depuis le cache).
- Test web : `CI=1 npx expo export --platform web --output-dir dist`, servir `dist/` (ignoré par git), piloter avec
  Playwright (`/opt/node22/lib/node_modules/playwright`, `executablePath: '/opt/pw-browsers/chromium'`, `--no-sandbox`).
- Ne pas utiliser `pkill -f` avec un motif présent dans la commande elle-même (tue le shell). Arrêter un serveur de test : `fuser -k PORT/tcp`.
- Lancer sur téléphone : `npm install && npm start`, scanner le QR code avec Expo Go.

- **Pourquoi pas de `Modal` ni de `KeyboardAvoidingView`** : Expo 57 impose l'edge-to-edge sur Android (la fenêtre ne se
  redimensionne jamais pour le clavier) et un `Modal` RN est une fenêtre séparée qui ne reçoit pas les événements
  `keyboardDidShow` (c'est la fenêtre principale qui les émet) → une feuille avec un champ ne pouvait pas remonter.
  Solution : feuilles dans la fenêtre principale + `paddingBottom = hauteur du clavier` sur l'écran/la feuille.
  Sur l'écran, la barre du bas est masquée pendant la saisie. Ne pas réintroduire `Modal` pour une feuille avec champ.
- Test du clavier sur web : réduire la hauteur de la fenêtre (Playwright `setViewportSize`) pendant qu'un champ a le
  focus ; sans `KeyboardScrollView` le champ reste sous la ligne du « clavier » (vérifié). La PWA ajoute
  `interactive-widget=resizes-content` au viewport pour que la page se raccourcisse aussi sur Android Chrome.
- Web : le rôle `dialog` est sur la feuille ; dans Playwright, le fond et la croix ont tous deux le libellé « Fermer »
  (le fond est recouvert par la feuille : utiliser `.last()` pour la croix).
- APK : signé avec la clé de debug du modèle Expo (identique d'un build à l'autre) → la v2 s'installe par-dessus la v1
  sans perdre les données. Bonne pratique quand même : exporter une sauvegarde avant de mettre à jour.

## Sécurité (audit du 2026-09-29)
- Vérifié : aucun secret ni clé dans le dépôt ; SQL 100 % paramétré ; pas d'`eval`/`innerHTML`/WebView/lien externe ;
  permissions Android : **corrigé en 2.1.0** : jusqu'à la 2.0.1 l'APK déclarait aussi INTERNET, SYSTEM_ALERT_WINDOW et le stockage externe (permissions par défaut d'Expo), désormais bloquées.
  **2.2.1 : l'APK ne déclare plus que 6 permissions** (relevé `aapt2` sur le CI) : `POST_NOTIFICATIONS`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` et
  `ACCESS_NETWORK_STATE` (les deux dernières déclarées par une dépendance d'`expo-notifications`, très probablement Firebase Messaging — origine non vérifiée : les AAR
  ne sont pas téléchargeables ici, proxy 403 ; gardées par prudence, les retirer risquerait un `SecurityException` impossible à tester sans téléphone) et la permission interne `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`. Retirées en 2.2.1 via `blockedPermissions` :
  FCM (`c2dm.permission.RECEIVE`), install referrer Play, 16 permissions de badge de lanceurs (Samsung, HTC, Sony, Huawei, Oppo…) ; Alam n'affiche pas de compteur
  sur son icône (`shouldSetBadge: false`). **Aucune permission restante n'ouvre l'accès à Internet** (détail dans `PRIVACY.md`). Le workflow APK applique une
  **liste blanche** sur l'APK final : toute autre permission fait échouer le build (la bloquer dans `app.json` ou l'autoriser dans le workflow ET `PRIVACY.md`).
  Le service worker ne touche que les GET de même origine ; l'import JSON est validé strictement (structure, profondeur, doublons, couleur `#RRGGBB`, ≤ 20 000 éléments).
- `npm audit --omit=dev` : 0 haute/critique, 14 modérées, toutes dans l'outillage de build Expo (`uuid`,
  `decode-uri-component`) — non livrées dans l'app ; ne pas faire `audit fix --force` (casse Expo).
- Limite connue : l'APK est signé avec la clé de debug **publique** du modèle Expo (pratique pour s'auto-installer, mais
  n'importe qui peut produire un APK qui remplace le vôtre). Si l'app est un jour diffusée : clé perso dans les secrets GitHub.
- Signature personnelle : `scripts/sign-release.py` + étape du workflow ; active si les 4 secrets GitHub
  `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` existent. La clé
  privée doit être générée sur la machine de l'utilisateur (jamais dans une session Claude ni dans le dépôt).
  Changer de clé = l'APK ne s'installe plus par-dessus l'ancien (désinstaller après export d'une sauvegarde).
- Durcissement appliqué : CSP stricte dans `public/index.html` (pas de script ni ressource externe, scripts en ligne
  interdits → l'enregistrement du service worker est dans `public/register-sw.js`), `referrer no-referrer`,
  workflows en lecture seule (écriture uniquement pour le job `release`),
  `persist-credentials: false`, `.github/dependabot.yml` (npm + actions), `SECURITY.md`.
  Si un jour on charge une ressource externe (police, API), il faut d'abord l'autoriser dans la CSP.
- Données non chiffrées sur l'appareil (localStorage / SQLite). Sauvegarde automatique Android **désactivée depuis la 2.1.0** (`allowBackup: false`,
  décision « données uniquement locales ») : changer de téléphone = exporter puis importer un fichier de sauvegarde.

## Conventions
- Développement sur la branche désignée par la session (v1 : `claude/create-application-dodfio`, mergée dans `main` ;
  v2 : `claude/serene-mendel-6n23bn` ; 2.1.0, 2.2.0 et 2.2.1 : `ccr-6cb66c58-01zp72`). Pas de PR sans demande explicite de l'utilisateur.
- Ne jamais commiter `node_modules/` ni `dist/`.
- Livrer un nouvel APK : incrémenter `version` (`app.json` + `package.json`/lock via `npm version X.Y.Z --no-git-tag-version`)
  ET `android.versionCode` (sinon Android peut refuser de remplacer l'ancien). Si le changement touche le manifeste / les permissions : lancer d'abord
  « APK Android » sur la **branche** (workflow_dispatch, `ref` = branche) et lire la sortie `aapt2` avant de fusionner. Puis fusionner dans `main` et lancer
  « APK Android » sur `main`. Changement d'icône ⇒ aussi `CACHE` de `public/sw.js`.
- Commandes : `npm start`, `npm test`, `npm run typecheck`.
