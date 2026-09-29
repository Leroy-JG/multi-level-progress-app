# multi-level-progress-app
App mobile de suivi de progression de projets multi-niveaux (projets, sous-projets, tâches, sous-tâches).

- 4 niveaux : projet → sous-projet → tâche → sous-tâche, avec une barre de progression à chaque niveau.
- Poids de chaque élément dans son parent : 1/N par défaut ou pourcentage choisi (ex. 70 / 30). Le total fait toujours 100 %.
- Accordéons : dans la liste de chaque écran, on déploie un sous-projet (ou une tâche) pour voir et cocher son contenu sur place, avec nom et progression à chaque niveau.
- Projets distincts, avec sélecteur et couleur. Données stockées localement (SQLite).

## Lancer
```bash
npm install
npm start        # puis scanner le QR code avec Expo Go (Android / iOS), ou appuyer sur "w" pour le web
npm test         # tests de la logique de progression
npm run typecheck
```

Voir `CLAUDE.md` pour les décisions de conception et l'avancement.
