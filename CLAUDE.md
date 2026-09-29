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
- [ ] **Non testé sur téléphone** (SQLite natif jamais exécuté ici) → Expo Go
- [x] Rappels : notifications locales via `expo-notifications` (`src/notifications`), **code jamais exécuté sur un vrai
      téléphone** ; sur web/PWA les rappels sont enregistrés mais ne sonnent pas (l'UI le dit)
- [x] Icône « A » (Raleway ExtraBold doré + barre de progression, sur `#26428B`), nom « Alam », splash
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
- Écrans : `app/index.tsx` (projet), `calendar`, `stats`, `settings`, `node/[id]`. Barre du bas maison
  (`BottomBar`), pas expo-router Tabs (en cours de dépréciation dans Expo 57).
- Web : la pile de navigation garde les écrans précédents dans le DOM → dans les tests Playwright, utiliser `.last()`.

## Notes techniques
- `npx expo install` échoue dans l'environnement cloud (proxy) : utiliser `npm install pkg@version` avec les
  versions de `node_modules/expo/bundledNativeModules.json`. Ne pas laisser npm prendre le `latest` de react-native.
- Icônes : générées avec Playwright (rendu HTML de la police en base64) ; pas de Pillow dans l'environnement.
- Test web : `CI=1 npx expo export --platform web --output-dir dist`, servir `dist/` (ignoré par git), piloter avec
  Playwright (`/opt/node22/lib/node_modules/playwright`, `executablePath: '/opt/pw-browsers/chromium'`, `--no-sandbox`).
- Ne pas utiliser `pkill -f` avec un motif présent dans la commande elle-même (tue le shell). Arrêter un serveur de test : `fuser -k PORT/tcp`.
- Lancer sur téléphone : `npm install && npm start`, scanner le QR code avec Expo Go.

## Conventions
- Développement sur la branche `claude/create-application-dodfio`.
- Ne jamais commiter `node_modules/` ni `dist/`.
- Commandes : `npm start`, `npm test`, `npm run typecheck`.
