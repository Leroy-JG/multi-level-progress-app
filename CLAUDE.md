# multi-level-progress-app — mémoire du projet

Ce fichier est lu automatiquement par Claude Code à chaque session. Il sert de mémoire : le tenir à jour
à chaque décision ou étape terminée.

## But
App mobile de suivi de progression de projets multi-niveaux. Nom affiché : **« Alam »** (renommé depuis « W »). Identifiants internes gardés tels quels : clé localStorage `w:data:v2`, format d’export `w-progress` (compatibilité des données).
Public : tout le monde, usage **solo, hors ligne, sans compte**. Android + iPhone.
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
- [x] 27 tests unitaires ; parcours complet testé dans Chromium (16 vérifications)
- [x] **v2** (2.0.0, `versionCode` 2) : accordéons récursifs + clavier qui ne masque plus les champs (voir ci-dessous)
- [ ] **Non testé sur téléphone** (SQLite natif jamais exécuté ici) → Expo Go. Idem pour le **clavier Android** de la v2 :
      la logique est testée dans Chromium (fenêtre réduite pour simuler le clavier) mais pas avec un vrai clavier Android
- [x] Rappels : notifications locales via `expo-notifications` (`src/notifications`), **code jamais exécuté sur un vrai
      téléphone** ; sur web/PWA les rappels sont enregistrés mais ne sonnent pas (l'UI le dit)
- [x] Icône = **barre de progression** (cadre crème `#F4EBD9` + remplissage doré `#C9A227` à 68 %, sur `#26428B`) —
      remplace l'ancien « A » (les variantes « 3 barres empilées » et « pilule seule » ont été écartées : elles font
      penser à un menu hamburger / un interrupteur). Nom « Alam », splash
- [x] PWA : `public/` (manifest, sw.js qui précache page + JS, icônes), testée hors ligne et sous sous-chemin GitHub Pages
- [x] Workflows : `.github/workflows/pages.yml` (site, sur push `main`) et `android-apk.yml` (APK, à la main ou tag `v*`)
      — **jamais exécutés** (ne peuvent pas l'être depuis ici)
- [ ] À faire par l'utilisateur : fusionner la branche dans `main`, activer Pages (Réglages → Pages → Source :
      GitHub Actions), lancer « APK Android » pour obtenir `Alam.apk`
- [ ] Test réel sur téléphone (Android via APK/Expo Go, iPhone via la PWA « Ajouter à l'écran d'accueil »)
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
- Écrans : `app/index.tsx` (projet), `calendar`, `stats`, `settings`, `node/[id]`. Barre du bas maison
  (`BottomBar`), pas expo-router Tabs (en cours de dépréciation dans Expo 57).
- Web : la pile de navigation garde les écrans précédents dans le DOM → dans les tests Playwright, utiliser `.last()`.

## Notes techniques
- `npx expo install` échoue dans l'environnement cloud (proxy) : utiliser `npm install pkg@version` avec les
  versions de `node_modules/expo/bundledNativeModules.json`. Ne pas laisser npm prendre le `latest` de react-native.
- Icônes : générées avec Playwright (SVG rendu dans Chromium, capture PNG, `omitBackground` pour l'adaptive et le
  splash) ; pas de Pillow dans l'environnement. 8 fichiers à régénérer ensemble : `assets/{icon,adaptive-icon,
  splash-icon,favicon}.png` et `public/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png`. Zones de
  sécurité : adaptive Android = cercle de 66 % (motif réduit à 80 %), maskable PWA = cercle de 80 %.
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
  seule permission Android = notifications ; le service worker ne touche que les GET de même origine ;
  l'import JSON est validé strictement (structure, profondeur, doublons, couleur `#RRGGBB`, ≤ 20 000 éléments).
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
- Données non chiffrées sur l'appareil (localStorage / SQLite) ; sauvegarde automatique Android laissée activée (choix de l'utilisateur : pratique pour changer de téléphone ; à
  réévaluer si l'app est diffusée — mettre `android.allowBackup: false` pour garder les données hors du cloud Google).

## Conventions
- Développement sur la branche désignée par la session (v1 : `claude/create-application-dodfio`, mergée dans `main` ;
  v2 : `claude/serene-mendel-6n23bn`). Pas de PR sans demande explicite de l'utilisateur.
- Ne jamais commiter `node_modules/` ni `dist/`.
- Commandes : `npm start`, `npm test`, `npm run typecheck`.
